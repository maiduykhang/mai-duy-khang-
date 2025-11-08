import { kv } from '@vercel/kv';

// --- INITIAL MOCK DATA (SERVER-SIDE) ---
// This data will be used to seed the Vercel KV database on the first run.
const mockUsersDatabase = [
    { id: 1, email: 'tuyendung@7-eleven.vn', passwordHash: 'hashed_password_123', name: '7-Eleven', phone: '0901234567', role: 'employer', isLocked: false },
    { id: 2, email: 'hr@thecoffeehouse.vn', passwordHash: 'hashed_password_123', name: 'The Coffee House', phone: '0987654321', role: 'employer', isLocked: false },
    { id: 3, email: 'recruitment@kfcvietnam.com.vn', passwordHash: 'hashed_password_123', name: 'KFC', phone: '0912345678', role: 'employer', isLocked: true },
    { id: 4, email: 'tuyendung@guardian.com.vn', passwordHash: 'hashed_password_123', name: 'Guardian', phone: '0998877665', role: 'employer', isLocked: false },
    { id: 100, email: 'admin@workhub.vn', passwordHash: 'admin_pass', name: 'WorkHub Admin', phone: '0111222333', role: 'admin', isLocked: false },
    { id: 201, email: 'applicant1@email.com', passwordHash: 'hashed_password_123', name: 'Nguyễn Văn An', phone: '0911111111', role: 'jobseeker', isLocked: false }
];
const mockJobsDatabase = [
    {
        id: 1, title: "Nhân viên Bán hàng (Part-time)", company: "7-Eleven", companyId: 1, logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/7-eleven_logo.svg/1200px-7-eleven_logo.svg.png", location: "24 Tôn Thất Tùng, P. Bến Thành, Quận 1", salary: "5 - 8 triệu", rating: 4.5, reviewCount: 182, isVerified: true, postedDate: "2 giờ trước", description: "Chào đón khách hàng, tư vấn sản phẩm, thực hiện thanh toán và giữ gìn vệ sinh cửa hàng. Làm việc theo ca xoay linh hoạt, phù hợp cho sinh viên.", requirements: ["Nam/Nữ từ 18 - 25 tuổi", "Nhanh nhẹn, trung thực, có trách nhiệm", "Không yêu cầu kinh nghiệm, sẽ được đào tạo"], benefits: ["Lương thưởng theo giờ cạnh tranh", "Môi trường làm việc năng động", "Giảm giá đặc biệt cho nhân viên"], industry: "Bán lẻ", employmentType: "Bán thời gian", interviewAddress: "Tầng 7, Tòa nhà Saigon Trade Center, 37 Tôn Đức Thắng, Q.1", recruiter: { name: "Phòng Nhân sự 7-Eleven Việt Nam", email: "tuyendung@7-eleven.vn", hotline: "0901234567", officeLocation: "Tầng 7, Tòa nhà Saigon Trade Center, 37 Tôn Đức Thắng, Q.1", officeGps: [10.7756, 106.7045] }, workLocationGps: [10.7701, 106.6947], schedule: "Ca xoay 4-8 tiếng/ngày. Sáng: 6h-14h, Chiều: 14h-22h, Tối: 22h-6h.", reviews: [{ author: "Sinh viên ẩn danh", comment: "Làm gần nhà, lương ổn, các anh chị rất thân thiện.", rating: 5, status: 'visible' }, { author: "Người đi làm", comment: "Công việc đơn giản, phù hợp kiếm thêm thu nhập.", rating: 4, status: 'visible' }], isFeatured: false,
    },
    {
        id: 2, title: "Nhân viên Pha chế (Barista)", company: "The Coffee House", companyId: 2, logo: "https://upload.wikimedia.org/wikipedia/vi/thumb/c/ce/The_Coffee_House_logo.png/800px-The_Coffee_House_logo.png", location: "159-161 Nguyễn Du, P. Bến Thành, Quận 1", salary: "6 - 9 triệu", rating: 4.7, reviewCount: 250, isVerified: true, postedDate: "Hôm qua", description: "Pha chế các loại đồ uống theo công thức, đảm bảo chất lượng sản phẩm và phục vụ khách hàng một cách chuyên nghiệp.", requirements: ["Đam mê cà phê và ngành dịch vụ", "Có kinh nghiệm là một lợi thế", "Thái độ vui vẻ, tích cực"], benefits: ["Được đào tạo bài bản về cà phê", "Lộ trình thăng tiến rõ ràng", "Bảo hiểm đầy đủ theo luật lao động"], industry: "F&B", employmentType: "Toàn thời gian", interviewAddress: "86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM", recruiter: { name: "Bộ phận Tuyển dụng The Coffee House", email: "hr@thecoffeehouse.vn", hotline: "0987654321", officeLocation: "86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM", officeGps: [10.7725, 106.6853] }, workLocationGps: [10.7731, 106.6957], schedule: "Ca 8 tiếng/ngày, xoay ca theo sự sắp xếp của quản lý. Tuần nghỉ 1 ngày.", reviews: [{ author: "Barista", comment: "Môi trường chuyên nghiệp, học được nhiều thứ.", rating: 5, status: 'visible' }, { author: "Cựu nhân viên", comment: "Áp lực nhưng xứng đáng.", rating: 4, status: 'visible' }], isFeatured: true,
    },
];

const initialData = {
    jobs: mockJobsDatabase,
    users: mockUsersDatabase,
    payments: [],
    reports: [],
    actionLogs: [],
    privateChats: [],
    applications: [],
};

const DATA_KEY = 'workhub_data_store';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            // Add cache-control headers to prevent Vercel and browsers from caching the data response.
            // This ensures that any client fetching data always gets the latest version from the KV store,
            // making data changes appear instantly for all users.
            res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            
            let data = await kv.get(DATA_KEY);
            if (!data) {
                // Seed data if it doesn't exist
                await kv.set(DATA_KEY, initialData);
                data = initialData;
                console.log('Database seeded with initial data.');
            }
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const updates = req.body;
            if (typeof updates !== 'object' || updates === null) {
                return res.status(400).json({ error: 'Invalid request body' });
            }

            // Fetch current data
            let currentData: any = await kv.get(DATA_KEY);
            if (!currentData) {
                currentData = initialData;
            }
            
            // Merge updates with current data
            const newData = { ...currentData, ...updates };

            // Save back to KV
            await kv.set(DATA_KEY, newData);

            return res.status(200).json({ success: true, message: 'Data updated successfully.' });
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

    } catch (error: any) {
        console.error('API Error:', error.message);
        
        // --- Fallback Mechanism ---
        // If an error occurs during a GET request, it's likely a KV connection issue
        // (e.g., missing credentials). Fall back to serving the initial mock data
        // to allow the frontend to load and render correctly.
        if (req.method === 'GET') {
            console.warn('KV store operation failed. Serving initial mock data as a fallback.');
            return res.status(200).json(initialData);
        }

        // For other methods like POST, it's crucial to report the failure to the client
        // so they know their update was not saved.
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}