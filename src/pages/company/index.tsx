import styles from 'styles/client.module.scss';
import CompanyCard from '@/components/client/card/company.card';

const ClientCompanyPage = () => {
    return (
        <div className={styles["container"]} style={{ paddingTop: 20, paddingBottom: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
                <CompanyCard showPagination={true} />
            </div>
        </div>
    );
};

export default ClientCompanyPage;