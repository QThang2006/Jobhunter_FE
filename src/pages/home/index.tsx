import { Divider } from 'antd';
import styles from 'styles/client.module.scss';
import SearchClient from '@/components/client/search.client';
import JobCard from '@/components/client/card/job.card';
import CompanyCard from '@/components/client/card/company.card';

const HomePage = () => {
    return (
        <div className={`${styles["container"]} ${styles["home-section"]}`}>
            {/* Banner giới thiệu nền tảng BakeJobs */}
            <div style={{
                background: "linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)",
                borderRadius: "12px",
                padding: "24px 28px",
                marginTop: "20px",
                border: "1px solid #ffd591",
                boxShadow: "0 2px 10px rgba(250, 140, 22, 0.08)"
            }}>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#873800", marginBottom: "6px" }}>
                    🥐 Chào mừng bạn đến với BakeJobs — Cổng Việc Làm & Nhân Sự Ngành Bánh
                </div>
                <div style={{ fontSize: "14px", color: "#595959", lineHeight: 1.6 }}>
                    Nền tảng kết nối Thợ bánh, Phụ bếp, Thu ngân với Hệ thống các Tiệm Bánh & Chuỗi F&B uy tín. Tìm kiếm vị trí làm việc theo ca linh hoạt, ứng tuyển nhanh chóng!
                </div>
            </div>

            <div className="search-content" style={{ marginTop: 20 }}>
                <SearchClient />
            </div>
            <Divider />
            <CompanyCard />
            <div style={{ margin: 50 }}></div>
            <Divider />
            <JobCard />
        </div>
    );
};

export default HomePage;
