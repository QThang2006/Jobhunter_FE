import { useNavigate } from 'react-router-dom';
import styles from './ChatWidget.module.scss';

export interface IJobMini {
    id: number;
    name: string;
    location: string;
    salary: number;
    level: string;
    slug?: string;
    company?: {
        name: string;
    };
    updatedAt?: string;
}

interface IProps {
    job: IJobMini;
}

const JobCardMini = (props: IProps) => {
    const { job } = props;
    const navigate = useNavigate();

    const handleJobClick = () => {
        navigate(`/job/AI-Generate-Job?id=${job.id}`);
    }

    const formatSalary = (salary: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary);
    }

    return (
        <div className={styles.jobCardMini} onClick={handleJobClick}>
            <h4>{job.level ? `[${job.level}] ` : ''}{job.name}</h4>
            <p className={styles.salary}>{formatSalary(job.salary)}</p>
            <div className={styles.meta}>
                <span>📍 {job.location}</span>
                <span>⚡ {job.level}</span>
            </div>
        </div>
    )
}

export default JobCardMini;
