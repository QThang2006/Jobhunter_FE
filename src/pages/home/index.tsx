import { Divider } from 'antd';
import styles from 'styles/client.module.scss';
import SearchClient from '@/components/client/search.client';
import JobCard from '@/components/client/card/job.card';
import CompanyCard from '@/components/client/card/company.card';

const HomePage = () => {
    return (
        <div className={`${styles["container"]} ${styles["home-section"]}`} style={{ paddingTop: 16, paddingBottom: 24 }}>
            <SearchClient />
            <Divider style={{ margin: "24px 0 16px", borderColor: '#e5e7eb' }} />
            <CompanyCard />
            <Divider style={{ margin: "28px 0 16px", borderColor: '#e5e7eb' }} />
            <JobCard />
        </div>
    );
};

export default HomePage;