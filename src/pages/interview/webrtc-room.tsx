import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Input, Progress, Row, Space, Tag, Typography, Upload, message } from 'antd';
import {
    AudioMutedOutlined,
    AudioOutlined,
    DesktopOutlined,
    DisconnectOutlined,
    PaperClipOutlined,
    SendOutlined,
    VideoCameraAddOutlined,
    VideoCameraOutlined
} from '@ant-design/icons';
import { callFetchWebRtcRoom } from '@/config/api';
import { IWebRtcRoomInfo } from '@/types/backend';
import { useAppSelector } from '@/redux/hooks';
import { useWebSocket } from '@/context/websocket.context';

const { Title, Text } = Typography;

interface P2PChatItem {
    sender: string;
    text?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    time: string;
    mine: boolean;
}

const CHUNK_BYTES = 16 * 1024; // 16KB cho mỗi gói RTCDataChannel an toàn mọi trình duyệt

const WebRtcInterviewRoomPage = () => {
    const { resumeId } = useParams<{ resumeId: string }>();
    const navigate = useNavigate();
    const currentUser = useAppSelector(state => state.account.user);
    const { stompClient } = useWebSocket();

    const [roomInfo, setRoomInfo] = useState<IWebRtcRoomInfo | null>(null);
    const [mediaReady, setMediaReady] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [connStatus, setConnStatus] = useState<string>('Đang khởi tạo Camera/Mic...');
    const [micEnabled, setMicEnabled] = useState<boolean>(true);
    const [camEnabled, setCamEnabled] = useState<boolean>(true);
    const [p2pMessages, setP2pMessages] = useState<P2PChatItem[]>([]);
    const [chatText, setChatText] = useState<string>('');
    const [transferPct, setTransferPct] = useState<number>(0);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const clientInstanceId = useRef<string>(`${currentUser?.id || 'u'}-${Math.random().toString(36).slice(2, 8)}`);

    // Bộ đệm ghép file nhận qua RTCDataChannel P2P
    const incomingFileMeta = useRef<{ name: string; size: number; sender: string } | null>(null);
    const incomingChunks = useRef<ArrayBuffer[]>([]);
    const incomingReceived = useRef<number>(0);

    const sendSignal = useCallback((roomId: string, payload: Record<string, any>) => {
        if (!stompClient || !stompClient.connected) return;
        stompClient.send(`/app/webrtc/${roomId}`, {}, JSON.stringify({
            ...payload,
            senderInstance: clientInstanceId.current,
            senderName: currentUser?.name || currentUser?.email || 'Peer'
        }));
    }, [stompClient, currentUser]);

    const setupDataChannel = useCallback((dc: RTCDataChannel) => {
        dc.binaryType = 'arraybuffer';
        dc.onopen = () => {
            setConnStatus('✓ Đã kết nối P2P trực tiếp (UDP Video + RTCDataChannel)');
        };
        dc.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.kind === 'TEXT') {
                        setP2pMessages(prev => [...prev, {
                            sender: msg.sender,
                            text: msg.text,
                            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                            mine: false
                        }]);
                    } else if (msg.kind === 'FILE_META') {
                        incomingFileMeta.current = { name: msg.name, size: msg.size, sender: msg.sender };
                        incomingChunks.current = [];
                        incomingReceived.current = 0;
                        setTransferPct(1);
                    } else if (msg.kind === 'FILE_END' && incomingFileMeta.current) {
                        const blob = new Blob(incomingChunks.current);
                        const url = URL.createObjectURL(blob);
                        const meta = incomingFileMeta.current;
                        setP2pMessages(prev => [...prev, {
                            sender: meta.sender,
                            fileName: meta.name,
                            fileUrl: url,
                            fileSize: meta.size,
                            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                            mine: false
                        }]);
                        incomingFileMeta.current = null;
                        incomingChunks.current = [];
                        setTransferPct(100);
                        message.success(`Đã nhận tệp P2P trực tiếp: ${meta.name}`);
                    }
                } catch {
                    // ignore
                }
            } else if (event.data instanceof ArrayBuffer && incomingFileMeta.current) {
                incomingChunks.current.push(event.data);
                incomingReceived.current += event.data.byteLength;
                const pct = Math.min(99, Math.round((incomingReceived.current * 100) / Math.max(1, incomingFileMeta.current.size)));
                setTransferPct(pct);
            }
        };
        dataChannelRef.current = dc;
    }, []);

    const createPeerConnection = useCallback((info: IWebRtcRoomInfo) => {
        if (pcRef.current) {
            pcRef.current.close();
        }
        const pc = new RTCPeerConnection({
            iceServers: info.iceServers?.length ? info.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal(info.roomId, { type: 'ice-candidate', candidate: event.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setConnStatus('✓ Đã kết nối P2P trực tiếp (UDP/DTLS)');
            } else if (pc.connectionState === 'connecting') {
                setConnStatus('Đang bắt tay ICE/STUN xuyên NAT...');
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setConnStatus('Đối phương đã rời phòng hoặc mất kết nối P2P');
            }
        };

        pc.ondatachannel = (event) => {
            setupDataChannel(event.channel);
        };

        pcRef.current = pc;
        return pc;
    }, [sendSignal, setupDataChannel]);

    // 1. Lấy thông tin phòng & mở Camera/Mic TRƯỚC khi bắt tay Signaling
    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            if (!resumeId) return;
            const res = await callFetchWebRtcRoom(resumeId);
            if (!res?.data) {
                setErrorMsg(res?.message || 'Không thể truy cập phòng phỏng vấn này.');
                return;
            }
            if (cancelled) return;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                setConnStatus('Đang chờ đối phương vào phòng phỏng vấn...');
            } catch {
                setConnStatus('Chế độ không Camera/Mic (Vẫn dùng được Chat & Gửi tệp P2P DataChannel)');
            }

            if (!cancelled) {
                setRoomInfo(res.data);
                setMediaReady(true);
            }
        };
        init();

        return () => {
            cancelled = true;
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            pcRef.current?.close();
        };
    }, [resumeId]);

    // 2. Đăng ký kênh Signaling WebSocket STOMP để bắt tay SDP Offer / Answer / ICE (chỉ chạy sau khi mediaReady)
    useEffect(() => {
        if (!mediaReady || !roomInfo || !stompClient || !stompClient.connected) return;
        createPeerConnection(roomInfo);
        pendingCandidatesRef.current = [];

        const flushPendingIce = async (pcInstance: RTCPeerConnection) => {
            while (pendingCandidatesRef.current.length > 0) {
                const cand = pendingCandidatesRef.current.shift();
                if (cand) {
                    try {
                        await pcInstance.addIceCandidate(new RTCIceCandidate(cand));
                    } catch {
                        // ignore stale candidate
                    }
                }
            }
        };

        const sub = stompClient.subscribe(`/topic/webrtc/${roomInfo.roomId}`, async (frame) => {
            if (!frame.body) return;
            const signal = JSON.parse(frame.body);
            if (signal.senderInstance === clientInstanceId.current) return;

            try {
                if (signal.type === 'peer-ready') {
                    // Tạo kết nối mới sạch sẽ khi đối phương mới vào hoặc vừa F5
                    pendingCandidatesRef.current = [];
                    const freshPc = createPeerConnection(roomInfo);
                    const dc = freshPc.createDataChannel('jobcake-p2p-channel');
                    setupDataChannel(dc);
                    const offer = await freshPc.createOffer();
                    await freshPc.setLocalDescription(offer);
                    sendSignal(roomInfo.roomId, { type: 'offer', sdp: offer });
                } else if (signal.type === 'offer') {
                    const freshPc = createPeerConnection(roomInfo);
                    await freshPc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    await flushPendingIce(freshPc);
                    const answer = await freshPc.createAnswer();
                    await freshPc.setLocalDescription(answer);
                    sendSignal(roomInfo.roomId, { type: 'answer', sdp: answer });
                } else if (signal.type === 'answer') {
                    const activePc = pcRef.current;
                    if (activePc && activePc.signalingState === 'have-local-offer') {
                        await activePc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                        await flushPendingIce(activePc);
                    }
                } else if (signal.type === 'ice-candidate' && signal.candidate) {
                    const activePc = pcRef.current;
                    if (activePc && activePc.remoteDescription && activePc.remoteDescription.type) {
                        await activePc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    } else {
                        pendingCandidatesRef.current.push(signal.candidate);
                    }
                } else if (signal.type === 'peer-leave') {
                    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
                    setConnStatus('Đối phương đã rời phòng phỏng vấn.');
                }
            } catch (err) {
                console.error('WebRTC Signaling Error:', err);
            }
        });

        // Báo hiệu mình đã sẵn sàng trong phòng
        sendSignal(roomInfo.roomId, { type: 'peer-ready' });

        return () => {
            sendSignal(roomInfo.roomId, { type: 'peer-leave' });
            sub.unsubscribe();
            pcRef.current?.close();
        };
    }, [mediaReady, roomInfo, stompClient, createPeerConnection, sendSignal, setupDataChannel]);

    const toggleMic = () => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMicEnabled(audioTrack.enabled);
        }
    };

    const toggleCam = () => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setCamEnabled(videoTrack.enabled);
        }
    };

    const handleShareScreen = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(screenTrack);
            }
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = screenStream;
            }
            screenTrack.onended = () => {
                const camTrack = localStreamRef.current?.getVideoTracks()[0];
                if (sender && camTrack) sender.replaceTrack(camTrack);
                if (localVideoRef.current && localStreamRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }
            };
        } catch {
            // user cancelled
        }
    };

    const handleSendP2PText = () => {
        const dc = dataChannelRef.current;
        if (!dc || dc.readyState !== 'open') {
            message.warning('Kênh P2P chưa mở (cần cả HR và Ứng viên cùng đang ở trong phòng)!');
            return;
        }
        if (!chatText.trim()) return;
        const senderName = currentUser?.name || currentUser?.email || 'Tôi';
        dc.send(JSON.stringify({ kind: 'TEXT', sender: senderName, text: chatText.trim() }));
        setP2pMessages(prev => [...prev, {
            sender: 'Bạn',
            text: chatText.trim(),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            mine: true
        }]);
        setChatText('');
    };

    const handleSendP2PFile = async (file: File) => {
        const dc = dataChannelRef.current;
        if (!dc || dc.readyState !== 'open') {
            message.warning('Cần kết nối P2P với đối phương trước khi truyền tệp trực tiếp!');
            return false;
        }
        const senderName = currentUser?.name || currentUser?.email || 'Tôi';
        dc.send(JSON.stringify({ kind: 'FILE_META', name: file.name, size: file.size, sender: senderName }));

        const buffer = await file.arrayBuffer();
        let offset = 0;
        while (offset < buffer.byteLength) {
            const slice = buffer.slice(offset, offset + CHUNK_BYTES);
            dc.send(slice);
            offset += slice.byteLength;
            setTransferPct(Math.min(99, Math.round((offset * 100) / Math.max(1, buffer.byteLength))));
        }
        dc.send(JSON.stringify({ kind: 'FILE_END' }));
        setTransferPct(100);

        const localUrl = URL.createObjectURL(file);
        setP2pMessages(prev => [...prev, {
            sender: 'Bạn',
            fileName: file.name,
            fileUrl: localUrl,
            fileSize: file.size,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            mine: true
        }]);
        message.success(`Đã truyền trực tiếp P2P tệp "${file.name}" sang trình duyệt đối phương!`);
        return false;
    };

    if (errorMsg) {
        return (
            <div style={{ maxWidth: 680, margin: '48px auto', padding: 16 }}>
                <Alert type="error" showIcon message="Không thể vào phòng phỏng vấn" description={errorMsg} />
                <Button style={{ marginTop: 16 }} onClick={() => navigate('/')}>Quay về Trang chủ</Button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1260, margin: '18px auto', padding: '0 16px 32px' }}>
            <Card style={{ marginBottom: 14, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <Space align="center">
                            <Title level={4} style={{ margin: 0 }}>
                                🎥 Phòng Phỏng Vấn Trực Tuyến P2P (WebRTC)
                            </Title>
                            <Tag color="blue">{roomInfo?.participantRole === 'INTERVIEWER' ? 'Nhà Tuyển Dụng (HR)' : 'Ứng Viên'}</Tag>
                        </Space>
                        <div style={{ marginTop: 4, color: '#4b5563', fontSize: 13 }}>
                            Vị trí: <strong>{roomInfo?.jobName}</strong> • {roomInfo?.companyName} • Ứng viên: <strong>{roomInfo?.candidateName}</strong>
                        </div>
                    </div>
                    <Badge
                        status={connStatus.startsWith('✓') ? 'success' : 'processing'}
                        text={<Text strong>{connStatus}</Text>}
                    />
                </div>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} md={12}>
                            <Card size="small" title="Màn Hình Đối Phương (Remote P2P Stream)" style={{ borderRadius: 10 }}>
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    style={{ width: '100%', height: 290, background: '#0f172a', borderRadius: 8, objectFit: 'cover' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} md={12}>
                            <Card size="small" title="Màn Hình Của Bạn (Local Stream)" style={{ borderRadius: 10 }}>
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    style={{ width: '100%', height: 290, background: '#1e293b', borderRadius: 8, objectFit: 'cover' }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Card style={{ marginTop: 12, borderRadius: 10, textAlign: 'center' }}>
                        <Space wrap size={12}>
                            <Button
                                type={micEnabled ? 'default' : 'primary'}
                                danger={!micEnabled}
                                icon={micEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                                onClick={toggleMic}
                            >
                                {micEnabled ? 'Tắt Mic' : 'Bật Mic'}
                            </Button>
                            <Button
                                type={camEnabled ? 'default' : 'primary'}
                                danger={!camEnabled}
                                icon={camEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
                                onClick={toggleCam}
                            >
                                {camEnabled ? 'Tắt Camera' : 'Bật Camera'}
                            </Button>
                            <Button icon={<DesktopOutlined />} onClick={handleShareScreen}>
                                Chia Sẻ Màn Hình / Ảnh Bánh
                            </Button>
                            <Button
                                type="primary"
                                danger
                                icon={<DisconnectOutlined />}
                                onClick={() => navigate(-1)}
                            >
                                Rời Phòng Họp
                            </Button>
                        </Space>
                    </Card>
                </Col>

                {/* Kênh Chat & Gửi File trực tiếp P2P qua RTCDataChannel (Không lưu qua Cloud!) */}
                <Col xs={24} lg={8}>
                    <Card
                        title="Trao Đổi & Truyền Tệp P2P (RTCDataChannel)"
                        style={{ borderRadius: 10, height: '100%', display: 'flex', flexDirection: 'column' }}
                        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12 }}
                    >
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            Tin nhắn & tệp danh mục bánh ở khung này truyền thẳng <strong>Trình duyệt ↔ Trình duyệt (UDP/SCTP)</strong>, không tốn băng thông Server!
                        </div>

                        <div style={{ flex: 1, minHeight: 250, maxHeight: 310, overflowY: 'auto', background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                            {p2pMessages.map((m, idx) => (
                                <div key={idx} style={{ marginBottom: 8, textAlign: m.mine ? 'right' : 'left' }}>
                                    <div style={{
                                        display: 'inline-block',
                                        maxWidth: '88%',
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        background: m.mine ? '#1677ff' : '#ffffff',
                                        color: m.mine ? '#fff' : '#111827',
                                        border: m.mine ? 'none' : '1px solid #e5e7eb',
                                        textAlign: 'left'
                                    }}>
                                        <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{m.sender} • {m.time}</div>
                                        {m.text && <div style={{ fontSize: 13 }}>{m.text}</div>}
                                        {m.fileUrl && (
                                            <a
                                                href={m.fileUrl}
                                                download={m.fileName}
                                                style={{ color: m.mine ? '#bae0ff' : '#1677ff', fontWeight: 600, fontSize: 13 }}
                                            >
                                                📎 Tải tệp P2P: {m.fileName}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {transferPct > 0 && transferPct < 100 && (
                            <Progress percent={transferPct} size="small" status="active" />
                        )}

                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            <Upload beforeUpload={handleSendP2PFile} showUploadList={false}>
                                <Button icon={<PaperClipOutlined />} block>
                                    Gửi Ảnh Bánh / Đề Test Trực Tiếp P2P
                                </Button>
                            </Upload>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input
                                    placeholder="Nhập tin nhắn P2P..."
                                    value={chatText}
                                    onChange={e => setChatText(e.target.value)}
                                    onPressEnter={handleSendP2PText}
                                />
                                <Button type="primary" icon={<SendOutlined />} onClick={handleSendP2PText}>
                                    Gửi
                                </Button>
                            </Space.Compact>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default WebRtcInterviewRoomPage;
