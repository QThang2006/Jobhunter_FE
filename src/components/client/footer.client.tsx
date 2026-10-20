const Footer = () => {
    return (
        <footer style={{ padding: "24px 15px", textAlign: "center", background: "#fcf8f2", borderTop: "1px solid #f0e6d6", color: "#666" }}>
            <div style={{ fontWeight: 600, color: "#873800", fontSize: "15px", marginBottom: "6px" }}>
                🥐 BakeJobs — Nền tảng Tuyển dụng & Kết nối Nhân sự Chuyên biệt cho các Tiệm Bánh & Chuỗi F&B
            </div>
            <div style={{ fontSize: "13px", color: "#8c8c8c" }}>
                Hỗ trợ ứng viên tìm việc làm theo ca linh hoạt • Kết nối hệ thống tiệm bánh uy tín &copy; {new Date().getFullYear()} BakeJobs. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
