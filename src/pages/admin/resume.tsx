import DataTable from "@/components/client/data-table";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { IResume } from "@/types/backend";
import { ActionType, ProColumns, ProFormSelect } from '@ant-design/pro-components';
import { Space, message, notification, Tag, Tabs } from "antd";
import { useState, useRef } from 'react';
import dayjs from 'dayjs';
import { callDeleteResume } from "@/config/api";
import queryString from 'query-string';
import { fetchResume } from "@/redux/slice/resumeSlide";
import ViewDetailResume from "@/components/admin/resume/view.resume";
import InterviewSchedule from "@/components/admin/resume/interview.schedule";
import { ALL_PERMISSIONS } from "@/config/permissions";
import Access from "@/components/share/access";
import { sfIn, sfAnd, sfGe, sfLe } from "spring-filter-query-builder";
import { EditOutlined, DownloadOutlined, CalendarOutlined, TableOutlined } from "@ant-design/icons";
import { useWebSocket } from "@/context/websocket.context"; // Import hook
import { useEffect } from "react";

const ResumePage = () => {
    const tableRef = useRef<ActionType>();

    const isFetching = useAppSelector(state => state.resume.isFetching);
    const meta = useAppSelector(state => state.resume.meta);
    const resumes = useAppSelector(state => state.resume.result);
    const dispatch = useAppDispatch();

    // -- WebSocket Section --
    const { stompClient } = useWebSocket();

    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const subscription = stompClient.subscribe('/topic/resumes', (message) => {
                if (message.body) {
                    // Nếu nhận được tính hiệu 'REFRESH', reload lại bảng
                    // message.success("Dữ liệu resume đã được cập nhật!"); // Optional notify
                    reloadTable(false);
                }
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [stompClient]);
    // -----------------------

    const [dataInit, setDataInit] = useState<IResume | null>(null);
    const [openViewDetail, setOpenViewDetail] = useState<boolean>(false);
    const [refreshSignal, setRefreshSignal] = useState<number>(0);

    const handleDeleteResume = async (id: string | undefined) => {
        if (id) {
            const res = await callDeleteResume(id);
            if (res && +res.statusCode === 200) {
                message.success('Xóa Resume thành công');
                reloadTable(false);
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message
                });
            }
        }
    }

    const reloadTable = (resetPageIndex = false) => {
        tableRef?.current?.reload(resetPageIndex);
        setRefreshSignal(prev => prev + 1);
    }

    const getFileDownloadUrl = (rawUrl?: string) => {
        if (!rawUrl) return '#';
        let file = rawUrl;
        if (rawUrl.startsWith('{')) {
            try {
                const parsed = JSON.parse(rawUrl);
                file = parsed.file || '';
            } catch {
                file = '';
            }
        }
        if (!file) return '#';
        return `${import.meta.env.VITE_BACKEND_URL}/storage/resume/${file}`;
    };

    const columns: ProColumns<IResume>[] = [
        {
            title: 'Id',
            dataIndex: 'id',
            width: 50,
            render: (text, record, index, action) => {
                return (
                    <a href="#" onClick={() => {
                        setOpenViewDetail(true);
                        setDataInit(record);
                    }}>
                        {record.id}
                    </a>
                )
            },
            hideInSearch: true,
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            sorter: true,
            render: (text, record) => {
                let color = 'default';
                let label = record.status || 'PENDING';
                if (record.status === 'PENDING') color = 'gold';
                if (record.status === 'REVIEWING') color = 'blue';
                if (record.status === 'APPROVED') color = 'green';
                if (record.status === 'REJECTED') color = 'red';

                return (
                    <Space direction="vertical" size={2}>
                        <Tag color={color} style={{ fontWeight: 500, borderRadius: 4 }}>
                            {label}
                        </Tag>
                        {record.interviewDate && (
                            <span style={{ fontSize: 11, color: '#1677ff' }}>
                                🕒 {record.interviewTime} ({record.interviewDate})
                            </span>
                        )}
                    </Space>
                );
            },
            renderFormItem: (item, props, form) => (
                <ProFormSelect
                    showSearch
                    mode="multiple"
                    allowClear
                    valueEnum={{
                        PENDING: 'PENDING',
                        REVIEWING: 'REVIEWING',
                        APPROVED: 'APPROVED',
                        REJECTED: 'REJECTED',
                    }}
                    placeholder="Chọn trạng thái"
                />
            ),
        },

        {
            title: 'Job',
            dataIndex: ["job", "name"],
            hideInSearch: true,
        },
        {
            title: 'Company',
            dataIndex: "companyName",
            hideInSearch: true,
        },

        {
            title: 'Email',
            dataIndex: 'email',
            hideInSearch: true,
        },

        {
            title: 'CreatedAt',
            dataIndex: 'createdAt',
            width: 200,
            sorter: true,
            render: (text, record, index, action) => {
                return (
                    <>{record.createdAt ? dayjs(record.createdAt).format('DD-MM-YYYY HH:mm:ss') : ""}</>
                )
            },
            hideInSearch: false,
            valueType: 'dateRange',
        },
        {
            title: 'UpdatedAt',
            dataIndex: 'updatedAt',
            width: 200,
            sorter: true,
            render: (text, record, index, action) => {
                return (
                    <>{record.updatedAt ? dayjs(record.updatedAt).format('DD-MM-YYYY HH:mm:ss') : ""}</>
                )
            },
            hideInSearch: true,
        },
        {

            title: 'Actions',
            hideInSearch: true,
            width: 100,
            render: (_value, entity, _index, _action) => (
                <Space>
                    <EditOutlined
                        style={{
                            fontSize: 20,
                            color: '#ffa500',
                        }}
                        type=""
                        onClick={() => {
                            setOpenViewDetail(true);
                            setDataInit(entity);
                        }}
                    />

                    <a
                        href={getFileDownloadUrl(entity?.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        <DownloadOutlined
                            style={{
                                fontSize: 20,
                                color: '#1890ff',
                                cursor: 'pointer'
                            }}
                        />
                    </a>

                    {/* <Popconfirm
                        placement="leftTop"
                        title={"Xác nhận xóa resume"}
                        description={"Bạn có chắc chắn muốn xóa resume này ?"}
                        onConfirm={() => handleDeleteResume(entity.id)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                    >
                        <span style={{ cursor: "pointer", margin: "0 10px" }}>
                            <DeleteOutlined
                                style={{
                                    fontSize: 20,
                                    color: '#ff4d4f',
                                }}
                            />
                        </span>
                    </Popconfirm> */}
                </Space>
            ),

        },
    ];

    const buildQuery = (params: any, sort: any, filter: any) => {
        const clone = { ...params };

        const q: any[] = [];
        if (clone?.status?.length) {
            q.push(sfIn("status", clone.status));
            delete clone.status;
        }

        if (clone?.createdAt) {
            const start = dayjs(clone.createdAt[0]).toISOString();
            const end = dayjs(clone.createdAt[1]).toISOString();
            q.push(sfGe("createdAt", start));
            q.push(sfLe("createdAt", end));
            delete clone.createdAt;
        }

        if (q.length > 0) {
            clone.filter = sfAnd(q).toString();
        }

        clone.page = clone.current;
        clone.size = clone.pageSize;

        delete clone.current;
        delete clone.pageSize;

        let temp = queryString.stringify(clone);

        let sortBy = "";
        if (sort && sort.status) {
            sortBy = sort.status === 'ascend' ? "sort=status,asc" : "sort=status,desc";
        }

        if (sort && sort.createdAt) {
            sortBy = sort.createdAt === 'ascend' ? "sort=createdAt,asc" : "sort=createdAt,desc";
        }
        if (sort && sort.updatedAt) {
            sortBy = sort.updatedAt === 'ascend' ? "sort=updatedAt,asc" : "sort=updatedAt,desc";
        }

        //mặc định sort theo updatedAt
        if (Object.keys(sortBy).length === 0) {
            temp = `${temp}&sort=updatedAt,desc`;
        } else {
            temp = `${temp}&${sortBy}`;
        }

        // temp += "&populate=companyId,jobId&fields=companyId.id, companyId.name, companyId.logo, jobId.id, jobId.name";
        return temp;
    }

    return (
        <div>
            <Access
                permission={ALL_PERMISSIONS.RESUMES.GET_PAGINATE}
            >
                <Tabs
                    defaultActiveKey="calendar"
                    items={[
                        {
                            key: 'calendar',
                            label: (
                                <span style={{ fontWeight: 500, fontSize: 14 }}>
                                    <CalendarOutlined style={{ marginRight: 6 }} />
                                    Lịch Phỏng Vấn (Tuần)
                                </span>
                            ),
                            children: (
                                <InterviewSchedule
                                    onOpenResumeDetail={(record) => {
                                        setDataInit(record);
                                        setOpenViewDetail(true);
                                    }}
                                    refreshSignal={refreshSignal}
                                />
                            )
                        },
                        {
                            key: 'table',
                            label: (
                                <span style={{ fontWeight: 500, fontSize: 14 }}>
                                    <TableOutlined style={{ marginRight: 6 }} />
                                    Danh Sách Hồ Sơ (CV)
                                </span>
                            ),
                            children: (
                                <DataTable<IResume>
                                    actionRef={tableRef}
                                    headerTitle="Danh sách Resumes"
                                    rowKey="id"
                                    loading={isFetching}
                                    columns={columns}
                                    dataSource={resumes}
                                    request={async (params, sort, filter): Promise<any> => {
                                        const query = buildQuery(params, sort, filter);
                                        dispatch(fetchResume({ query }))
                                    }}
                                    scroll={{ x: true }}
                                    pagination={
                                        {
                                            current: meta.page,
                                            pageSize: meta.pageSize,
                                            showSizeChanger: true,
                                            total: meta.total,
                                            showTotal: (total, range) => { return (<div> {range[0]}-{range[1]} trên {total} rows</div>) }
                                        }
                                    }
                                    rowSelection={false}
                                    toolBarRender={(_action, _rows): any => {
                                        return (
                                            <></>
                                        );
                                    }}
                                />
                            )
                        }
                    ]}
                />
            </Access>
            <ViewDetailResume
                open={openViewDetail}
                onClose={setOpenViewDetail}
                dataInit={dataInit}
                setDataInit={setDataInit}
                reloadTable={reloadTable}
            />
        </div>
    )
}

export default ResumePage;