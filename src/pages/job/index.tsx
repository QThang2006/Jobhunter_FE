import SearchClient from '@/components/client/search.client';
import { Divider } from 'antd';
import styles from 'styles/client.module.scss';
import JobCard from '@/components/client/card/job.card';

const ClientJobPage = () => {
    return (
        <div className={styles["container"]} style={{ paddingTop: 16, paddingBottom: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <SearchClient />
            <Divider style={{ margin: "20px 0 16px", borderColor: '#ebd9c8' }} />
            <div style={{ flex: 1 }}>
                <JobCard showPagination={true} />
            </div>
        </div>
    );
};

export default ClientJobPage;