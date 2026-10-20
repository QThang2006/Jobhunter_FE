import DataTable from "@/components/client/data-table";
import { useAppSelector } from "@/redux/hooks";
import { IWorkShift, IUser, ICompany } from "@/types/backend";
import { ActionType, ProColumns } from '@ant-design/pro-components';
import {
    Button,
    Col,
    DatePicker,
    Form,
    Input,
    Modal,
    Popconfirm,
    Row,
    Segmented,
    Select,
    Space,
    Tag,
    TimePicker,
    Tooltip,
    message,
    notification
} from "antd";
import { useState, useRef, useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
    callCreateWorkShift,
    callDeleteWorkShift,
    callFetchCompany,
    callFetchCompanyEmployees,
    callFetchWorkShift,
    callTransferWorkShift,
    callUpdateWorkShift
} from "@/config/api";
import {
    CalendarOutlined,
    DeleteOutlined,
    EditOutlined,
    FieldTimeOutlined,
    PlusOutlined,
    SwapOutlined,
    TableOutlined,
    UserOutlined
} from "@ant-design/icons";
import { useWebSocket } from "@/context/websocket.context";
import ShiftCalendarView, { getShiftColor } from "@/components/share/shift/shift.calendar.view";
import Access from "@/components/share/access";
import { ALL_PERMISSIONS } from "@/config/permissions";

dayjs.extend(customParseFormat);

const ShiftPage = () => {
    const tableRef = useRef<ActionType>();
    const user = useAppSelector(state => state.account.user);

    // View mode: 'calendar' (Lịch tổng thể) or 'table' (Dạng bảng)
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
    const [allShifts, setAllShifts] = useState<IWorkShift[]>([]);
    const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false);

    const fetchAllShiftsForCalendar = async () => {
        setLoadingCalendar(true);
        const res = await callFetchWorkShift('page=1&size=500&sort=shiftDate,asc');
        if (res?.data?.result) {
            setAllShifts(res.data.result);
        }
        setLoadingCalendar(false);
    };

    useEffect(() => {
        fetchAllShiftsForCalendar();
    }, []);

    // WebSocket auto reload
    const { stompClient } = useWebSocket();
    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const sub = stompClient.subscribe('/topic/shifts', () => {
                tableRef.current?.reload();
                fetchAllShiftsForCalendar();
            });
            return () => sub.unsubscribe();
        }
    }, [stompClient]);

    // Modals state
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
    const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);

    const [selectedShift, setSelectedShift] = useState<IWorkShift | null>(null);
    const [employees, setEmployees] = useState<IUser[]>([]);
    const [companies, setCompanies] = useState<ICompany[]>([]);

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [transferForm] = Form.useForm();

    // Load companies (for Super Admin)
    useEffect(() => {
        const loadCompanies = async () => {
            const res = await callFetchCompany('page=1&size=100');
            if (res?.data?.result) {
                setCompanies(res.data.result);
            }
        };
        loadCompanies();
    }, []);

    // Load employees when company changes or when opening create modal
    const loadEmployees = async (companyId?: string | number) => {
        const targetCompanyId = companyId || user?.company?.id;
        const res = await callFetchCompanyEmployees(targetCompanyId);
        if (res?.data) {
            setEmployees(res.data);
        }
    };

    const handleOpenCreate = (date?: Dayjs) => {
        createForm.resetFields();
        const initialCompanyId = user?.company?.id;
        if (initialCompanyId) {
            createForm.setFieldValue('companyId', initialCompanyId);
            loadEmployees(initialCompanyId);
        } else if (companies.length > 0) {
            loadEmployees(companies[0].id);
        }
        createForm.setFieldValue('shiftDate', date || dayjs());
        createForm.setFieldValue('shiftName', 'Ca Sáng');
        createForm.setFieldValue('startTime', dayjs('06:00', 'HH:mm'));
        createForm.setFieldValue('endTime', dayjs('14:00', 'HH:mm'));
        setIsCreateOpen(true);
    };

    const handleCreateShift = async (values: any) => {
        try {
            const payload = {
                userId: values.userId,
                companyId: values.companyId || user?.company?.id,
                shiftDate: dayjs(values.shiftDate).format('YYYY-MM-DD'),
                shiftName: values.shiftName,
                startTime: values.startTime ? dayjs(values.startTime).format('HH:mm') : undefined,
                endTime: values.endTime ? dayjs(values.endTime).format('HH:mm') : undefined,
                note: values.note
            };
            const res = await callCreateWorkShift(payload);
            if (res?.data) {
                message.success('Phân ca làm việc thành công');
                setIsCreateOpen(false);
                tableRef.current?.reload();
                fetchAllShiftsForCalendar();
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message
                });
            }
        } catch (error: any) {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: error.message
            });
        }
    };

    const handleOpenEdit = (record: IWorkShift) => {
        setSelectedShift(record);
        editForm.setFieldsValue({
            shiftName: record.shiftName,
            shiftDate: record.shiftDate ? dayjs(record.shiftDate, 'YYYY-MM-DD') : undefined,
            startTime: record.startTime ? dayjs(record.startTime, 'HH:mm') : undefined,
            endTime: record.endTime ? dayjs(record.endTime, 'HH:mm') : undefined,
            status: record.status,
            note: record.note
        });
        setIsEditOpen(true);
    };

    const handleUpdateShift = async (values: any) => {
        if (!selectedShift?.id) return;
        try {
            const payload: any = {
                shiftName: values.shiftName,
                shiftDate: values.shiftDate ? dayjs(values.shiftDate).format('YYYY-MM-DD') : undefined,
                startTime: values.startTime ? dayjs(values.startTime).format('HH:mm') : undefined,
                endTime: values.endTime ? dayjs(values.endTime).format('HH:mm') : undefined,
                status: values.status,
                note: values.note
            };
            const res = await callUpdateWorkShift(selectedShift.id, payload);
            if (res?.data) {
                message.success('Cập nhật ca làm việc thành công');
                setIsEditOpen(false);
                tableRef.current?.reload();
                fetchAllShiftsForCalendar();
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message
                });
            }
        } catch (error: any) {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: error.message
            });
        }
    };

    const handleOpenTransfer = async (record: IWorkShift) => {
        setSelectedShift(record);
        transferForm.resetFields();
        transferForm.setFieldValue('newShiftDate', record.shiftDate ? dayjs(record.shiftDate, 'YYYY-MM-DD') : dayjs());
        if (record.company?.id) {
            await loadEmployees(record.company.id);
        }
        setIsTransferOpen(true);
    };

    const handleTransferShift = async (values: any) => {
        if (!selectedShift?.id) return;
        try {
            const payload = {
                shiftId: selectedShift.id,
                newUserId: values.newUserId,
                newShiftDate: values.newShiftDate ? dayjs(values.newShiftDate).format('YYYY-MM-DD') : undefined,
                reason: values.reason
            };
            const res = await callTransferWorkShift(payload);
            if (res?.data) {
                message.success('Chuyển ca làm việc thành công');
                setIsTransferOpen(false);
                tableRef.current?.reload();
                fetchAllShiftsForCalendar();
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message
                });
            }
        } catch (error: any) {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: error.message
            });
        }
    };

    const handleDeleteShift = async (id: string | number) => {
        try {
            const res = await callDeleteWorkShift(id);
            if (res && +res.statusCode === 200) {
                message.success('Xóa ca làm việc thành công');
                tableRef.current?.reload();
                fetchAllShiftsForCalendar();
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message
                });
            }
        } catch (error: any) {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: error.message
            });
        }
    };

    const renderStatusTag = (status: string) => {
        switch (status) {
            case 'ASSIGNED':
                return <Tag color="blue">Đã phân ca</Tag>;
            case 'TRANSFERRED':
                return <Tag color="orange">Đã chuyển ca</Tag>;
            case 'CONFIRMED':
                return <Tag color="green">Đã xác nhận</Tag>;
            case 'COMPLETED':
                return <Tag color="purple">Hoàn thành</Tag>;
            case 'CANCELLED':
                return <Tag color="red">Đã hủy</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const columns: ProColumns<IWorkShift>[] = [
        {
            title: 'STT',
            key: 'index',
            width: 50,
            align: 'center',
            render: (_text, _record, index) => index + 1,
            hideInSearch: true,
        },
        {
            title: 'Ngày Làm',
            dataIndex: 'shiftDate',
            sorter: true,
            valueType: 'date',
            render: (_text, record) => (
                <Space>
                    <CalendarOutlined style={{ color: '#2563eb' }} />
                    <span style={{ fontWeight: 600 }}>{dayjs(record.shiftDate).format('DD/MM/YYYY')}</span>
                </Space>
            ),
        },
        {
            title: 'Ca Làm',
            dataIndex: 'shiftName',
            render: (_text, record) => {
                const color = getShiftColor(record.shiftName);
                return (
                    <Tag color={color} style={{ fontWeight: 500, fontSize: 13 }}>
                        {record.shiftName}
                    </Tag>
                );
            },
        },
        {
            title: 'Khung Giờ',
            key: 'time',
            hideInSearch: true,
            render: (_text, record) => (
                <Space>
                    <FieldTimeOutlined style={{ color: '#6b7280' }} />
                    <span>{record.startTime || '--:--'} - {record.endTime || '--:--'}</span>
                </Space>
            ),
        },
        {
            title: 'Nhân Viên',
            dataIndex: ['user', 'name'],
            render: (_text, record) => (
                <div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>
                        <UserOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                        {record.user?.name || 'Chưa gán'}
                    </div>
                    {record.user?.email && (
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{record.user.email}</div>
                    )}
                </div>
            ),
        },
        {
            title: 'Tiệm Bánh',
            dataIndex: ['company', 'name'],
            hideInSearch: true,
            render: (_text, record) => record.company?.name || '--',
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            valueEnum: {
                ASSIGNED: { text: 'Đã phân ca', status: 'Processing' },
                TRANSFERRED: { text: 'Đã chuyển ca', status: 'Warning' },
                CONFIRMED: { text: 'Đã xác nhận', status: 'Success' },
                COMPLETED: { text: 'Hoàn thành', status: 'Default' },
                CANCELLED: { text: 'Đã hủy', status: 'Error' },
            },
            render: (_text, record) => renderStatusTag(record.status),
        },
        {
            title: 'Ghi Chú',
            dataIndex: 'note',
            ellipsis: true,
            hideInSearch: true,
            render: (_text, record) => (
                <Tooltip title={record.note}>
                    <span>{record.note || '--'}</span>
                </Tooltip>
            ),
        },
        {
            title: 'Hành Động',
            key: 'action',
            hideInSearch: true,
            width: 170,
            render: (_text, record) => (
                <Space size="small">
                    <Access
                        permission={ALL_PERMISSIONS.SHIFTS.TRANSFER}
                        hideChildren
                    >
                        <Tooltip title="Chuyển ca cho nhân viên khác">
                            <Button
                                size="small"
                                type="primary"
                                icon={<SwapOutlined />}
                                onClick={() => handleOpenTransfer(record)}
                                style={{
                                    background: '#3b82f6',
                                    borderColor: '#3b82f6',
                                    borderRadius: 6
                                }}
                            >
                                Chuyển ca
                            </Button>
                        </Tooltip>
                    </Access>
                    <Access
                        permission={ALL_PERMISSIONS.SHIFTS.UPDATE}
                        hideChildren
                    >
                        <Tooltip title="Chỉnh sửa ca">
                            <Button
                                size="small"
                                type="text"
                                icon={<EditOutlined style={{ color: '#1677ff' }} />}
                                onClick={() => handleOpenEdit(record)}
                            />
                        </Tooltip>
                    </Access>
                    <Access
                        permission={ALL_PERMISSIONS.SHIFTS.DELETE}
                        hideChildren
                    >
                        <Popconfirm
                            title="Xóa ca làm việc"
                            description="Bạn có chắc chắn muốn xóa ca làm này?"
                            onConfirm={() => record.id && handleDeleteShift(record.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Popconfirm>
                    </Access>
                </Space>
            ),
        },
    ];

    return (
        <Access
            permission={ALL_PERMISSIONS.SHIFTS.GET_PAGINATE}
        >
            <div>
                {/* Top Toolbar / Mode Switch */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12,
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: '14px 18px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#111827', fontSize: 19, fontWeight: 700 }}>
                            Quản Lý Ca Làm Việc Nhân Viên
                        </h2>
                        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                            Theo dõi lịch tổng thể của tiệm bánh, phân ca và điều phối chuyển ca cho nhân viên
                        </div>
                    </div>

                    <Space size="middle" wrap>
                        <Segmented
                            value={viewMode}
                            onChange={(val: any) => setViewMode(val)}
                            options={[
                                { label: 'Lịch Tổng Thể', value: 'calendar', icon: <CalendarOutlined /> },
                                { label: 'Dạng Bảng', value: 'table', icon: <TableOutlined /> },
                            ]}
                        />

                        <Access
                            permission={ALL_PERMISSIONS.SHIFTS.CREATE}
                            hideChildren
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => handleOpenCreate()}
                                style={{
                                    background: '#3b82f6',
                                    borderColor: '#3b82f6',
                                    fontWeight: 600,
                                    borderRadius: 8
                                }}
                            >
                                Tạo Ca Làm Mới
                            </Button>
                        </Access>
                    </Space>
                </div>

            {/* View Mode: Calendar vs Table */}
            {viewMode === 'calendar' ? (
                <ShiftCalendarView
                    shifts={allShifts}
                    loading={loadingCalendar}
                    isAdmin={true}
                    employees={employees}
                    onOpenCreateForDate={(date) => handleOpenCreate(date)}
                    onOpenTransfer={(shift) => handleOpenTransfer(shift)}
                    onOpenEdit={(shift) => handleOpenEdit(shift)}
                    onDeleteShift={(id) => handleDeleteShift(id)}
                />
            ) : (
                <DataTable<IWorkShift>
                    actionRef={tableRef}
                    headerTitle="Danh Sách Chi Tiết Ca Làm Việc"
                    rowKey="id"
                    columns={columns}
                    request={async (params, sort) => {
                        let query = `page=${params.current}&size=${params.pageSize}`;
                        if (params.shiftDate) {
                            query += `&filter=shiftDate : '${params.shiftDate}'`;
                        }
                        if (params.status) {
                            query += `&filter=status : '${params.status}'`;
                        }
                        if (sort && Object.keys(sort).length > 0) {
                            const field = Object.keys(sort)[0];
                            const order = sort[field] === 'ascend' ? 'asc' : 'desc';
                            query += `&sort=${field},${order}`;
                        } else {
                            query += '&sort=shiftDate,desc&sort=startTime,asc';
                        }
                        const res = await callFetchWorkShift(query);
                        return {
                            data: res?.data?.result ?? [],
                            success: true,
                            total: res?.data?.meta?.total ?? 0,
                        };
                    }}
                />
            )}

            {/* Modal Tạo Ca Làm Việc */}
            <Modal
                title={<Space><FieldTimeOutlined style={{ color: '#3b82f6' }} /><span>Tạo Ca Làm Việc Mới</span></Space>}
                open={isCreateOpen}
                onCancel={() => setIsCreateOpen(false)}
                onOk={() => createForm.submit()}
                okText="Tạo Ca Làm"
                cancelText="Hủy"
                okButtonProps={{ style: { background: '#3b82f6', borderColor: '#3b82f6' } }}
                width={650}
                destroyOnClose
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateShift}
                    style={{ marginTop: 16 }}
                >
                    <Row gutter={16}>
                        {user.role?.name === 'SUPER_ADMIN' && (
                            <Col span={24}>
                                <Form.Item
                                    name="companyId"
                                    label="Thuộc Tiệm Bánh"
                                    rules={[{ required: true, message: 'Vui lòng chọn tiệm bánh' }]}
                                >
                                    <Select
                                        placeholder="Chọn tiệm bánh"
                                        onChange={(val) => loadEmployees(val)}
                                        options={companies.map(c => ({ label: c.name, value: c.id }))}
                                    />
                                </Form.Item>
                            </Col>
                        )}

                        <Col span={24} md={12}>
                            <Form.Item
                                name="userId"
                                label="Nhân Viên Đảm Nhận"
                                rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
                            >
                                <Select
                                    placeholder="Chọn nhân viên"
                                    options={employees.map(e => ({
                                        label: `${e.name} (${e.email})`,
                                        value: e.id
                                    }))}
                                    showSearch
                                    optionFilterProp="label"
                                />
                            </Form.Item>
                        </Col>

                        <Col span={24} md={12}>
                            <Form.Item
                                name="shiftDate"
                                label="Ngày Làm Việc"
                                rules={[{ required: true, message: 'Vui lòng chọn ngày làm việc' }]}
                            >
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24} md={8}>
                            <Form.Item
                                name="shiftName"
                                label="Tên Ca Làm"
                                rules={[{ required: true, message: 'Vui lòng nhập tên ca' }]}
                            >
                                <Input placeholder="VD: Ca Sáng" />
                            </Form.Item>
                        </Col>
                        <Col span={12} md={8}>
                            <Form.Item
                                name="startTime"
                                label="Giờ Bắt Đầu"
                                rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}
                            >
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12} md={8}>
                            <Form.Item
                                name="endTime"
                                label="Giờ Kết Thúc"
                                rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}
                            >
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="note" label="Ghi Chú Nhiệm Vụ">
                        <Input.TextArea
                            rows={3}
                            placeholder="Ghi chú phân công (VD: Bếp bánh ngọt, nướng croissant sáng sớm, kiểm kho...)"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal Chuyển Ca Làm Việc (Owner Shift Transfer) */}
            <Modal
                title={
                    <Space>
                        <SwapOutlined style={{ color: '#3b82f6' }} />
                        <span>Chuyển Giao Ca Làm Việc Cho Nhân Viên Khác</span>
                    </Space>
                }
                open={isTransferOpen}
                onCancel={() => setIsTransferOpen(false)}
                onOk={() => transferForm.submit()}
                okText="Xác Nhận Chuyển Ca"
                cancelText="Hủy"
                okButtonProps={{ style: { background: '#3b82f6', borderColor: '#3b82f6' } }}
                width={560}
                destroyOnClose
            >
                {selectedShift && (
                    <div style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginBottom: 16
                    }}>
                        <div style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                            Ca hiện tại: {selectedShift.shiftName} ({selectedShift.startTime} - {selectedShift.endTime})
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                            Ngày: {dayjs(selectedShift.shiftDate).format('DD/MM/YYYY')} • Tiệm: {selectedShift.company?.name}
                        </div>
                        <div style={{ fontSize: 13, color: '#2563eb', marginTop: 4 }}>
                            Nhân viên đang đảm nhận: <strong>{selectedShift.user?.name}</strong> ({selectedShift.user?.email})
                        </div>
                    </div>
                )}

                <Form
                    form={transferForm}
                    layout="vertical"
                    onFinish={handleTransferShift}
                >
                    <Form.Item
                        name="newUserId"
                        label="Chuyển sang cho nhân viên"
                        rules={[{ required: true, message: 'Vui lòng chọn nhân viên nhận ca mới' }]}
                    >
                        <Select
                            placeholder="Chọn nhân viên mới nhận ca"
                            options={employees
                                .filter(e => e.id !== selectedShift?.user?.id)
                                .map(e => ({
                                    label: `${e.name} (${e.email})`,
                                    value: e.id
                                }))
                            }
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>

                    <Form.Item
                        name="newShiftDate"
                        label="Ngày làm việc mới (để trống nếu giữ nguyên ngày hiện tại)"
                    >
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="reason"
                        label="Lý do chuyển ca / Ghi chú"
                        rules={[{ required: true, message: 'Vui lòng nhập lý do chuyển ca' }]}
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="VD: Nhân viên bận việc cá nhân đột xuất, quản lý hoán đổi ca cho nhau..."
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal Chỉnh Sửa Ca Làm Việc */}
            <Modal
                title={<Space><EditOutlined style={{ color: '#1677ff' }} /><span>Chỉnh Sửa Ca Làm Việc</span></Space>}
                open={isEditOpen}
                onCancel={() => setIsEditOpen(false)}
                onOk={() => editForm.submit()}
                okText="Cập Nhật"
                cancelText="Hủy"
                width={560}
                destroyOnClose
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleUpdateShift}
                    style={{ marginTop: 16 }}
                >
                    <Row gutter={16}>
                        <Col span={24} md={12}>
                            <Form.Item
                                name="shiftName"
                                label="Tên Ca Làm"
                                rules={[{ required: true, message: 'Nhập tên ca' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={24} md={12}>
                            <Form.Item
                                name="shiftDate"
                                label="Ngày Làm Việc"
                                rules={[{ required: true, message: 'Chọn ngày' }]}
                            >
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="startTime" label="Giờ Bắt Đầu">
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="endTime" label="Giờ Kết Thúc">
                                <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="status" label="Trạng Thái">
                                <Select
                                    options={[
                                        { label: 'Đã phân ca', value: 'ASSIGNED' },
                                        { label: 'Đã chuyển ca', value: 'TRANSFERRED' },
                                        { label: 'Đã xác nhận', value: 'CONFIRMED' },
                                        { label: 'Hoàn thành', value: 'COMPLETED' },
                                        { label: 'Đã hủy', value: 'CANCELLED' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="note" label="Ghi Chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
        </Access>
    );
};

export default ShiftPage;
