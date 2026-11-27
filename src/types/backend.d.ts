export interface IBackendRes<T> {
    error?: string | string[];
    message: string;
    statusCode: number | string;
    data?: T;
}

export interface IModelPaginate<T> {
    meta: {
        page: number;
        pageSize: number;
        pages: number;
        total: number;
    },
    result: T[]
}

export interface IAccount {
    access_token: string;
    user: {
        id: string;
        email: string;
        name: string;
        phone?: string;
        role: {
            id: string;
            name: string;
            permissions: {
                id: string;
                name: string;
                apiPath: string;
                method: string;
                module: string;
            }[]
        };
        company?: {
            id: string | number;
            name: string;
            logo?: string;
        };
    }
}

export interface IGetAccount extends Omit<IAccount, "access_token"> { }

export interface ICompany {
    id?: string;
    name?: string;
    address?: string;
    logo: string;
    description?: string;
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ISkill {
    id?: string;
    name?: string;
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IUser {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    password?: string;
    age: number;
    gender: string;
    address: string;
    role?: {
        id: string;
        name: string;
    }
    company?: {
        id: string;
        name: string;
    }
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IJob {
    id?: string;
    name: string;
    skills: ISkill[];
    company?: {
        id: string;
        name: string;
        logo?: string;
        address?: string;
    }
    location: string;
    salary: number;
    quantity: number;
    level: string;
    description: string;
    startDate: Date;
    endDate: Date;
    active: boolean;
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IResume {
    id?: string;
    email: string;
    phone?: string;
    message?: string;
    userId: string;
    url: string;
    status: string;
    meetLink?: string;
    interviewDate?: string;
    interviewTime?: string;
    interviewType?: 'ONLINE_MEET' | 'OFFLINE';
    note?: string;
    companyName?: string;
    company?: {
        id?: string | number;
        name: string;
        logo?: string;
    };
    user?: {
        id?: string | number;
        name: string;
        email?: string;
    };
    job?: {
        id?: string | number;
        name: string;
    };
    companyId: string | {
        id: string;
        name: string;
        logo: string;
    };
    jobId: string | {
        id: string;
        name: string;
    };
    history?: {
        status: string;
        updatedAt: Date;
        updatedBy: { id: string; email: string }
    }[]
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IPermission {
    id?: string;
    name?: string;
    apiPath?: string;
    method?: string;
    module?: string;
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IRole {
    id?: string;
    name: string;
    description: string;
    active: boolean;
    permissions: IPermission[] | string[];
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ISubscribers {
    id?: string;
    name?: string;
    email?: string;
    skills: string[];
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface INotification {
    id: number;
    title: string;
    body: string;
    status: string;
    read: boolean;
    createdAt: string;
}

export type WorkShiftStatus = 'ASSIGNED' | 'CONFIRMED' | 'COMPLETED' | 'TRANSFERRED' | 'CANCELLED';

export interface IWorkShift {
    id?: string | number;
    shiftDate: string;
    shiftName: string;
    startTime?: string;
    endTime?: string;
    note?: string;
    status: WorkShiftStatus;
    user?: {
        id: string | number;
        name: string;
        email: string;
    };
    company?: {
        id: string | number;
        name: string;
        logo?: string;
    };
    job?: {
        id: string | number;
        name: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface IBakeryStationDto {
    stationId: string;
    bakerName: string;
    email?: string;
    kitchenZone: string;
    companyName?: string;
    ipAddress: string;
    tcpPort: number;
    udpPort: number;
    status: string;
    pingMs: number;
}

export interface ISharedRecipeIndex {
    id: number;
    fileName: string;
    fileSize: number;
    sha256Hash: string;
    stationId: string;
    bakerName: string;
    kitchenZone: string;
    companyName: string;
    updatedAt: string;
}

export interface IBakeryStationLog {
    id: number;
    trackerHost: string;
    eventType: string;
    detail: string;
    activeStationCount: number;
    sharedRecipeCount: number;
    createdAt: string;
}

export interface IBakeryNetworkStatus {
    trackerOnline: boolean;
    trackerHost: string;
    rmiPort: number;
    lastSyncAt: string | null;
    onlineStations: IBakeryStationDto[];
    sharedRecipes: ISharedRecipeIndex[];
    recentLogs: IBakeryStationLog[];
    pendingDirectiveCount: number;
}

export interface IWebChatContact {
    userId: number;
    name: string;
    email: string;
    roleName: string;
    companyName: string;
    lastMessage: string;
    lastMessageAt: string | null;
    unreadCount: number;
}

export interface IWebChatMessage {
    id: number;
    senderId: number;
    senderName: string;
    senderEmail: string;
    receiverId: number;
    receiverName: string;
    receiverEmail: string;
    jobId?: number;
    jobName?: string;
    content: string;
    read: boolean;
    createdAt: string;
}

export interface IWebRtcRoomInfo {
    roomId: string;
    resumeId: number;
    candidateEmail: string;
    candidateName: string;
    jobName: string;
    companyName: string;
    interviewDate?: string;
    interviewTime?: string;
    participantRole: 'CANDIDATE' | 'INTERVIEWER';
    iceServers: { urls: string }[];
}

export interface IAiEvaluationResult {
    matchScore: number;
    verdict: string;
    summary: string;
    matchedSkills: string[];
    missingSkills: string[];
    strengths: string[];
    suggestedQuestions: string[];
    engineUsed: string;
}
