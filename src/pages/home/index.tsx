import { Divider } from 'antd';
import styles from 'styles/client.module.scss';
import SearchClient from '@/components/client/search.client';
import JobCard from '@/components/client/card/job.card';
import CompanyCard from '@/components/client/card/company.card';

const HomePage = () => {
    return (
        <div className={`${styles["container"]} ${styles["home-section"]}`}>
            <SearchClient />
            <Divider style={{ margin: "36px 0 28px" }} />
            <CompanyCard />
            <div style={{ margin: 40 }}></div>
            <Divider style={{ margin: "36px 0 28px" }} />
            <JobCard />
        </div>
    );
};

export default HomePage;