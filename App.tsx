import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---
type Job = {
  id: number;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  postedDate: string;
  description: string;
  requirements: string[];
  benefits: string[];
  industry: string;
  employmentType: string;
  recruiter: {
    name: string;
    email: string;
    hotline: string;
    officeLocation: string;
    officeGps: [number, number];
  };
  workLocationGps: [number, number];
  schedule: string;
  reviews: Review[];
  isFeatured: boolean;
  companyId: number; // Link job to a user
};

type ChatMessage = {
  sender: 'user' | 'bot';
  text: string;
  jobs?: Job[];
};

type Review = { 
    author: string; 
    comment: string; 
    rating: number; 
    // New status for moderation
    status: 'pending' | 'visible' | 'hidden';
};

type User = {
  id: number;
  email: string;
  passwordHash: string; // Simulate hashed password
  name: string;
  phone: string;
  role: 'employer' | 'admin' | 'jobseeker';
  isLocked: boolean;
};

type Payment = {
  id: string;
  date: string;
  service: string;
  amount: number;
  status: 'Completed' | 'Pending';
  userId: number;
};

type Report = {
    id: number;
    jobId: number;
    jobTitle: string;
    reason: string;
    details: string;
    status: 'pending' | 'resolved';
};

type ActionLog = {
    id: number;
    adminId: number;
    adminName: string;
    action: string;
    ipAddress: string;
    timestamp: string;
};

type PrivateChatMessage = {
    senderId: number;
    text: string;
    timestamp: number;
};

type PrivateChatSession = {
    sessionId: string; // e.g., 'jobId-applicantId' -> '2-201'
    jobId: number;
    participants: { applicantId: number; employerId: number; };
    messages: PrivateChatMessage[];
};

type Application = {
    id: number;
    jobId: number;
    applicantId: number;
    cvFileUrl: string; // Simulated URL
    submittedAt: string;
};

type CurrentUser = Omit<User, 'passwordHash'> | null;
type AppView = 'main' | 'login' | 'signup' | 'employerDashboard' | 'adminDashboard' | 'adminLogin' | 'forbidden';

// --- CONFIGURATION ---
// In a real production environment, these values should be loaded from environment variables (.env)
// and not be hardcoded in the source code for security reasons.
const CONFIG = {
    GOOGLE_API_KEY: process.env.API_KEY,
    SUPER_ADMIN: {
        username: 'superadmin@workhub.vn',
        passwordHash: 'super_secret_pass', // IMPORTANT: Replace with a real, strong hash from your .env file
        mfaSecret: '123456' // IMPORTANT: Replace with a real MFA secret from your .env file
    },
    TRUSTED_IPS: ['192.168.1.100'] // TODO: In production, load this from an environment variable as a comma-separated string
};


// --- REALISTIC & ACCURATE MOCK DATA ---
const initialUsers: User[] = [
    { id: 1, email: 'tuyendung@7-eleven.vn', passwordHash: 'hashed_password_123', name: '7-Eleven', phone: '0901234567', role: 'employer', isLocked: false },
    { id: 2, email: 'hr@thecoffeehouse.vn', passwordHash: 'hashed_password_123', name: 'The Coffee House', phone: '0987654321', role: 'employer', isLocked: false },
    { id: 3, email: 'recruitment@kfcvietnam.com.vn', passwordHash: 'hashed_password_123', name: 'KFC', phone: '0912345678', role: 'employer', isLocked: true },
    { id: 4, email: 'tuyendung@guardian.com.vn', passwordHash: 'hashed_password_123', name: 'Guardian', phone: '0998877665', role: 'employer', isLocked: false },
    { id: 100, email: 'admin@workhub.vn', passwordHash: 'admin_pass', name: 'WorkHub Admin', phone: '0111222333', role: 'admin', isLocked: false },
    { id: 201, email: 'applicant1@email.com', passwordHash: 'hashed_password_123', name: 'Nguyễn Văn An', phone: '0911111111', role: 'jobseeker', isLocked: false }
];

const initialJobs: Job[] = [
    {
        id: 1,
        title: "Nhân viên Bán hàng (Part-time)",
        company: "7-Eleven",
        companyId: 1,
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/7-eleven_logo.svg/1200px-7-eleven_logo.svg.png",
        location: "24 Tôn Thất Tùng, P. Bến Thành, Quận 1", // Specific address
        salary: "5 - 8 triệu",
        rating: 4.5,
        reviewCount: 182,
        isVerified: true,
        postedDate: "2 giờ trước",
        description: "Chào đón khách hàng, tư vấn sản phẩm, thực hiện thanh toán và giữ gìn vệ sinh cửa hàng. Làm việc theo ca xoay linh hoạt, phù hợp cho sinh viên.",
        requirements: ["Nam/Nữ từ 18 - 25 tuổi", "Nhanh nhẹn, trung thực, có trách nhiệm", "Không yêu cầu kinh nghiệm, sẽ được đào tạo"],
        benefits: ["Lương thưởng theo giờ cạnh tranh", "Môi trường làm việc năng động", "Giảm giá đặc biệt cho nhân viên"],
        industry: "Bán lẻ",
        employmentType: "Bán thời gian",
        recruiter: {
            name: "Phòng Nhân sự 7-Eleven Việt Nam",
            email: "tuyendung@7-eleven.vn",
            hotline: "0901234567",
            officeLocation: "Tầng 7, Tòa nhà Saigon Trade Center, 37 Tôn Đức Thắng, Q.1",
            officeGps: [10.7756, 106.7045]
        },
        workLocationGps: [10.7701, 106.6947], // Accurate GPS for 24 Tôn Thất Tùng
        schedule: "Ca xoay 4-8 tiếng/ngày. Sáng: 6h-14h, Chiều: 14h-22h, Tối: 22h-6h.",
        reviews: [
            { author: "Sinh viên ẩn danh", comment: "Làm gần nhà, lương ổn, các anh chị rất thân thiện.", rating: 5, status: 'visible' },
            { author: "Người đi làm", comment: "Công việc đơn giản, phù hợp kiếm thêm thu nhập.", rating: 4, status: 'visible' }
        ],
        isFeatured: false,
    },
    {
        id: 2,
        title: "Nhân viên Pha chế (Barista)",
        company: "The Coffee House",
        companyId: 2,
        logo: "https://upload.wikimedia.org/wikipedia/vi/thumb/c/ce/The_Coffee_House_logo.png/800px-The_Coffee_House_logo.png",
        location: "159-161 Nguyễn Du, P. Bến Thành, Quận 1", // Switched to a Q1 location for variety
        salary: "6 - 9 triệu",
        rating: 4.7,
        reviewCount: 250,
        isVerified: true,
        postedDate: "Hôm qua",
        description: "Pha chế các loại đồ uống theo công thức, đảm bảo chất lượng sản phẩm và phục vụ khách hàng một cách chuyên nghiệp.",
        requirements: ["Đam mê cà phê và ngành dịch vụ", "Có kinh nghiệm là một lợi thế", "Thái độ vui vẻ, tích cực"],
        benefits: ["Được đào tạo bài bản về cà phê", "Lộ trình thăng tiến rõ ràng", "Bảo hiểm đầy đủ theo luật lao động"],
        industry: "F&B",
        employmentType: "Toàn thời gian",
        recruiter: {
            name: "Bộ phận Tuyển dụng The Coffee House",
            email: "hr@thecoffeehouse.vn",
            hotline: "0987654321",
            officeLocation: "86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM",
            officeGps: [10.7725, 106.6853]
        },
        workLocationGps: [10.7731, 106.6957], // Accurate GPS for 159 Nguyễn Du
        schedule: "Ca 8 tiếng/ngày, xoay ca theo sự sắp xếp của quản lý. Tuần nghỉ 1 ngày.",
        reviews: [
            { author: "Barista", comment: "Môi trường chuyên nghiệp, học được nhiều thứ.", rating: 5, status: 'visible' },
            { author: "Cựu nhân viên", comment: "Áp lực nhưng xứng đáng.", rating: 4, status: 'visible' }
        ],
        isFeatured: true,
    },
    {
        id: 3,
        title: "Nhân viên Phục vụ Bàn",
        company: "KFC",
        companyId: 3,
        logo: "https://upload.wikimedia.org/wikipedia/vi/thumb/7/7e/KFC_logo.svg/1200px-KFC_logo.svg.png",
        location: "20 An Dương Vương, Phường 9, Quận 5", // Specific address
        salary: "5 - 7 triệu",
        rating: 4.2,
        reviewCount: 315,
        isVerified: true,
        postedDate: "3 ngày trước",
        description: "Tiếp nhận order, phục vụ đồ ăn và thức uống, đảm bảo sự hài lòng của khách hàng và duy trì vệ sinh khu vực ăn uống.",
        requirements: ["Từ 16 tuổi trở lên", "Siêng năng, chịu khó", "Có thể làm việc vào cuối tuần và ngày lễ"],
        benefits: ["Bữa ăn miễn phí theo ca", "Lương tháng 13", "Cơ hội trở thành quản lý cửa hàng"],
        industry: "F&B",
        employmentType: "Bán thời gian",
        recruiter: {
            name: "KFC Việt Nam Tuyển Dụng",
            email: "recruitment@kfcvietnam.com.vn",
            hotline: "0912345678",
            officeLocation: "Tầng 12, Tòa nhà Blue Sky, 01 Bạch Đằng, P.2, Q.Tân Bình",
            officeGps: [10.8015, 106.6625]
        },
        workLocationGps: [10.7570, 106.6672], // Accurate GPS for 20 An Dương Vương
        schedule: "Linh hoạt đăng ký ca 4-6 tiếng/ngày. Ưu tiên sinh viên.",
        reviews: [
            { author: "Sinh viên", comment: "Dễ xin việc, không cần kinh nghiệm, quản lý dễ tính.", rating: 4, status: 'visible' },
        ],
        isFeatured: false,
    },
    {
        id: 4,
        title: "Nhân viên Tư vấn Mỹ phẩm",
        company: "Guardian",
        companyId: 4,
        logo: "https://cdn.haitrieu.com/wp-content/uploads/2021/11/Logo-Guardian-White.png",
        location: "483 Sư Vạn Hạnh, Phường 12, Quận 10", // Specific address
        salary: "8 - 12 triệu",
        rating: 4.6,
        reviewCount: 98,
        isVerified: true,
        postedDate: "5 ngày trước",
        description: "Tư vấn các sản phẩm chăm sóc da và mỹ phẩm phù hợp với nhu cầu của khách hàng. Sắp xếp, trưng bày hàng hóa và quản lý tồn kho.",
        requirements: ["Yêu thích mỹ phẩm, có kiến thức về chăm sóc da", "Kỹ năng giao tiếp tốt", "Ngoại hình ưa nhìn"],
        benefits: ["Hoa hồng theo doanh số", "Được training sản phẩm mới thường xuyên", "Mua sản phẩm với giá ưu đãi của nhân viên"],
        industry: "Bán lẻ",
        employmentType: "Toàn thời gian",
        recruiter: {
            name: "Guardian Vietnam HR",
            email: "tuyendung@guardian.com.vn",
            hotline: "0998877665",
            officeLocation: "172 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM",
            officeGps: [10.7858, 106.6947]
        },
        workLocationGps: [10.7719, 106.6690], // Accurate GPS for 483 Sư Vạn Hạnh
        schedule: "Làm việc theo ca 8 tiếng, xoay ca. Ca 1: 8h30-16h30, Ca 2: 14h-22h.",
        reviews: [
            { author: "Beauty Advisor", comment: "Lương thưởng tốt, được tiếp xúc nhiều sản phẩm mới.", rating: 5, status: 'visible' },
            { author: "Khách hàng", comment: "Nhân viên ở đây tư vấn rất nhiệt tình.", rating: 5, status: 'visible' },
        ],
        isFeatured: false,
    }
];

const initialPayments: Payment[] = [
    { id: 'TXN001', userId: 1, date: '2024-07-15', service: 'Tin Nổi Bật', amount: 99000, status: 'Completed' },
    { id: 'TXN002', userId: 2, date: '2024-07-20', service: 'Tin Nổi Bật', amount: 99000, status: 'Completed' },
    { id: 'TXN003', userId: 1, date: '2024-07-22', service: 'Tin Nổi Bật', amount: 99000, status: 'Completed' },
    { id: 'TXN004', userId: 4, date: '2024-07-25', service: 'Tin Nổi Bật', amount: 99000, status: 'Completed' },
    { id: 'TXN005', userId: 2, date: '2024-07-28', service: 'Tin Nổi Bật', amount: 99000, status: 'Pending' },
];

// --- HELPER & ICON COMPONENTS ---
const StarIcon = ({ filled, half = false, className = "w-4 h-4", ...props }: { filled: boolean; half?: boolean; className?: string; [key: string]: any; }) => {
    if (half) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`${className} text-yellow-400`} {...props}>
                <path fillRule="evenodd" d="M12.962 2.514a1.5 1.5 0 00-1.924 0l-2.664 5.426-6.042.878a1.5 1.5 0 00-.832 2.573l4.372 4.26-1.033 6.018a1.5 1.5 0 002.176 1.58L12 19.549l5.4 2.84a1.5 1.5 0 002.176-1.58l-1.033-6.018 4.372-4.26a1.5 1.5 0 00-.832-2.573l-6.042-.878L12.962 2.514zM12 5.25v10.95l4.207 2.213-.803-4.688 3.404-3.318-4.707-.684L12 5.25z" clipRule="evenodd" />
            </svg>
        );
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`${className} ${filled ? 'text-yellow-400' : 'text-gray-300'}`} {...props}>
            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clipRule="evenodd" />
        </svg>
    );
};

const BookmarkIcon = ({ saved, className = "w-6 h-6", ...props }: { saved: boolean; className?: string; [key: string]: any; }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" className={`${className} ${saved ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);

const BellIcon = ({ className = "w-6 h-6", ...props }: { className?: string; [key: string]: any; }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const CopyIcon = ({ className = "w-5 h-5", ...props }: { className?: string; [key: string]: any; }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
);

const Rating = ({ rating, count }: { rating: number; count?: number }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars.push(<StarIcon key={i} filled={true} />);
        } else if (i - 0.5 <= rating) {
            stars.push(<StarIcon key={i} filled={true} half={true} />);
        } else {
            stars.push(<StarIcon key={i} filled={false} />);
        }
    }
    return (
        <div className="flex items-center">
            {stars}
            {count !== undefined && <span className="ml-2 text-xs text-gray-500">({count})</span>}
        </div>
    );
};

type ChatWidgetProps = {
    isChatOpen: boolean;
    setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
    chatMessages: ChatMessage[];
    userInput: string;
    setUserInput: React.Dispatch<React.SetStateAction<string>>;
    handleSendMessage: () => void;
    isBotTyping: boolean;
    isAiReady: boolean;
    selectedJob: Job | null;
    handleOpenJobFromChat: (job: Job) => void;
};

const ChatWidget = ({ isChatOpen, setIsChatOpen, chatMessages, userInput, setUserInput, handleSendMessage, isBotTyping, isAiReady, selectedJob, handleOpenJobFromChat }: ChatWidgetProps) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages, isBotTyping]);
    
    useEffect(() => {
        if (isChatOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isChatOpen]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [userInput]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-30">
            {isChatOpen && (
                 <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col">
                    <div className="p-3 bg-blue-600 text-white rounded-t-lg">
                        <h3 className="font-semibold">{selectedJob ? `Chat với NTD: ${selectedJob.company}` : 'Trợ lý AI WorkHub'}</h3>
                        <p className="text-xs">Hỏi tôi bất cứ điều gì về việc làm!</p>
                    </div>
                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
                        {chatMessages.length === 0 && (
                            <div className="text-center text-sm text-gray-500">Bắt đầu cuộc trò chuyện...</div>
                        )}
                        {chatMessages.map((msg, i) => (
                             <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.jobs ? (
                                    <div className="w-full space-y-2">
                                        <p className="max-w-[80%] p-2 rounded-lg text-sm shadow-sm whitespace-pre-wrap break-words bg-white text-gray-800 mb-2">{msg.text}</p>
                                        {msg.jobs.map(job => (
                                            <div key={job.id} className="bg-white rounded-lg p-2 shadow-sm border w-full text-left flex items-start space-x-3">
                                                <img src={job.logo} alt={job.company} className="w-10 h-10 object-contain rounded-md border p-1 bg-white mt-1"/>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-gray-800">{job.title}</p>
                                                    <p className="text-xs text-gray-600">{job.company}</p>
                                                    <button onClick={() => handleOpenJobFromChat(job)} className="mt-1 text-xs text-blue-600 font-semibold hover:underline">Xem chi tiết &rarr;</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className={`max-w-[80%] p-2 rounded-lg text-sm shadow-sm whitespace-pre-wrap break-words ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>{msg.text}</p>
                                )}
                            </div>
                        ))}
                        {isBotTyping && <div className="flex justify-start"><p className="p-2 rounded-lg text-sm bg-white text-gray-800 shadow-sm">...</p></div>}
                    </div>
                    <div className="p-2 border-t flex items-start">
                        <textarea 
                            ref={textareaRef}
                            value={userInput} 
                            onChange={e => setUserInput(e.target.value)} 
                            onKeyDown={handleKeyDown}
                            placeholder={!isAiReady ? "Trợ lý AI không sẵn sàng" : "Nhập câu hỏi..."}
                            className="flex-1 border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 resize-none overflow-hidden"
                            disabled={!isAiReady || isBotTyping}
                            rows={1}
                        />
                        <button 
                            onClick={handleSendMessage} 
                            className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 disabled:bg-blue-300 self-end"
                            disabled={!isAiReady || isBotTyping}
                        >Gửi</button>
                    </div>
                 </div>
            )}
            <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
        </div>
    );
};

// --- APP SUB-COMPONENTS ---
// Moved components outside of the main App component to prevent re-definition on each render,
// which fixes the bug of input fields losing focus.

const Header = ({ currentUser, setView, handleLogout, notificationRef, handleToggleNotifications, isNotificationOpen, newJobNotifications, handleOpenNotificationJob, setIsPostingModalOpen }: { currentUser: CurrentUser, setView: React.Dispatch<React.SetStateAction<AppView>>, handleLogout: () => void, notificationRef: React.RefObject<HTMLDivElement>, handleToggleNotifications: () => void, isNotificationOpen: boolean, newJobNotifications: Job[], handleOpenNotificationJob: (job: Job) => void, setIsPostingModalOpen: React.Dispatch<React.SetStateAction<boolean>> }) => (
    <header className="bg-white shadow-md sticky top-0 z-20">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div onClick={() => setView('main')} className="text-2xl font-bold text-blue-600 cursor-pointer">WorkHub</div>
            <div className="flex items-center space-x-4">
                {currentUser ? (
                    <>
                         <span className="text-sm text-gray-600 hidden md:block">Chào, {currentUser.name}</span>
                         {currentUser.role !== 'jobseeker' && <button onClick={() => setView(currentUser.role === 'admin' ? 'adminDashboard' : 'employerDashboard')} className="text-gray-600 hover:text-blue-600 text-sm font-semibold">Dashboard</button>}
                         <button onClick={handleLogout} className="text-gray-600 hover:text-blue-600 text-sm font-semibold">Đăng xuất</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setView('login')} className="text-gray-600 hover:text-blue-600 text-sm font-semibold">Đăng nhập</button>
                        <button onClick={() => setView('signup')} className="hidden md:block bg-gray-100 text-blue-600 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-semibold">Đăng ký</button>
                    </>
                )}
                <div ref={notificationRef} className="relative">
                    <button onClick={handleToggleNotifications} className="text-gray-600 hover:text-blue-600" aria-label="Notifications">
                        <BellIcon />
                        {newJobNotifications.length > 0 && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>}
                    </button>
                    {isNotificationOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border z-30">
                            <div className="p-3 font-semibold text-sm border-b">Thông báo mới</div>
                            {newJobNotifications.length > 0 ? (
                                 <ul className="py-1">
                                    {newJobNotifications.map(job => (
                                        <li key={job.id} onClick={() => handleOpenNotificationJob(job)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                                            <strong>{job.company}</strong> vừa đăng: {job.title}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="p-3 text-sm text-gray-500">Không có thông báo mới.</p>
                            )}
                        </div>
                    )}
                </div>
                {currentUser?.role === 'employer' && <button onClick={() => setIsPostingModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-semibold">Đăng tin</button>}
            </div>
        </nav>
    </header>
);

const ReportJobModal = ({ job, onClose, onSubmit, showToast }: { job: Job, onClose: () => void, onSubmit: (reason: string, details: string) => void, showToast: (message: string) => void }) => {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const reasons = ['Tin đăng lừa đảo', 'Yêu cầu nộp phí', 'Địa chỉ không chính xác', 'Thông tin sai sự thật', 'Khác'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            showToast('Vui lòng chọn lý do báo cáo.');
            return;
        }
        onSubmit(reason, details);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 p-5 border-b">Báo cáo tin đăng: {job.title}</h2>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">Lý do báo cáo <span className="text-red-500">*</span></label>
                        <div className="space-y-2">
                            {reasons.map(r => (
                                <label key={r} className="flex items-center">
                                    <input type="radio" name="reason" value={r} checked={reason === r} onChange={(e) => setReason(e.target.value)} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300" />
                                    <span className="ml-3 text-sm text-gray-700">{r}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-800 mb-1">Chi tiết (nếu có)</label>
                        <textarea name="details" id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="w-full border-gray-300 rounded-md" placeholder="Cung cấp thêm thông tin..."></textarea>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md mr-2 text-sm">Hủy</button>
                        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-md text-sm">Gửi báo cáo</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CvSubmissionForm = ({ job, currentUser, applications, onSubmit, showToast }: { job: Job, currentUser: CurrentUser, applications: Application[], onSubmit: (job: Job, file: File) => void, showToast: (message: string) => void }) => {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const hasApplied = useMemo(() => applications.some(app => app.jobId === job.id && app.applicantId === currentUser?.id), [applications, job.id, currentUser]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Kích thước file không được vượt quá 5MB.');
                setFile(null);
                return;
            }
            if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type)) {
                setError('Chỉ chấp nhận file .pdf hoặc .docx.');
                setFile(null);
                return;
            }
            setError('');
            setFile(selectedFile);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        if (file) {
            setIsLoading(true);
            onSubmit(job, file);
        } else {
            setError('Vui lòng chọn một file CV.');
        }
    };

    if (hasApplied) {
        return (
            <div className="mt-4 text-center p-4 bg-green-100 text-green-800 rounded-lg">
                <p className="font-semibold">Bạn đã ứng tuyển vào vị trí này.</p>
                <p className="text-sm">Nhà tuyển dụng sẽ sớm liên hệ với bạn.</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border-t-2 border-dashed border-gray-200 space-y-3">
            <h4 className="text-md font-bold text-gray-900">Ứng tuyển ngay</h4>
            <button type="button" onClick={() => showToast("Chức năng đang được phát triển")} className="w-full text-sm text-center py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Sử dụng CV online WorkHub</button>

            <div className="relative text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-50 text-gray-500">hoặc</span></div>
            </div>

            <div>
                <label htmlFor="cv-upload" className="block text-sm font-medium text-gray-700 mb-1">Tải lên CV từ máy tính</label>
                <input id="cv-upload" type="file" onChange={handleFileChange} accept=".pdf,.docx" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {file && <p className="text-xs text-gray-600 mt-1">Đã chọn: {file.name}</p>}
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-green-400 flex justify-center items-center">
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang nộp đơn...</span>
                    </>
                ) : (
                    'Nộp CV cho Nhà tuyển dụng'
                )}
            </button>
        </form>
    );
};


const JobDetailModal = ({ job, onClose, handleAddNewReview, showToast, handleStartPrivateChat, handleOpenReportModal, googleApiKey, currentUser, applications, handleCvSubmit }: { job: Job, onClose: () => void, handleAddNewReview: (jobId: number, review: Omit<Review, 'status'>) => void, showToast: (message: string) => void, handleStartPrivateChat: (job: Job) => void, handleOpenReportModal: (job: Job) => void, googleApiKey: string | undefined, currentUser: CurrentUser, applications: Application[], handleCvSubmit: (job: Job, file: File) => void }) => {
    const [showInterviewMap, setShowInterviewMap] = useState(false);
    const newReviewRef = useRef<{ rating: number, comment: string }>({ rating: 0, comment: '' });
    const [hoverRating, setHoverRating] = useState(0);
    const [currentRating, setCurrentRating] = useState(0);

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentRating > 0 && newReviewRef.current.comment.trim() !== '') {
            handleAddNewReview(job.id, { rating: currentRating, comment: newReviewRef.current.comment, author: "Người dùng ẩn danh" });
             (e.target as HTMLFormElement).reset();
             newReviewRef.current = { rating: 0, comment: '' };
             setHoverRating(0);
             setCurrentRating(0);
        } else {
            showToast("Vui lòng cho điểm và viết nhận xét.");
        }
    };
    
    const visibleReviews = job.reviews.filter(r => r.status === 'visible');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40" onClick={onClose}>
            <div className="bg-gray-50 rounded-lg shadow-xl w-[95%] md:w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                    <div className="flex items-center space-x-4">
                       <img src={job.logo} alt={job.company} className="w-16 h-16 object-contain rounded-md border p-1 bg-white" />
                       <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center">{job.title} {job.isFeatured && <span className="ml-3 text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">ƯU TIÊN</span>}</h2>
                            <h3 className="text-lg font-semibold text-blue-600">{job.company}</h3>
                       </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {['Mô tả công việc', 'Yêu cầu ứng viên', 'Lịch làm việc & Ca trực'].map(section => (
                             <div key={section}>
                                <h4 className="text-lg font-bold text-gray-900 mb-3 border-b-2 pb-2">{section}</h4>
                                <div className="text-base text-gray-900 space-y-1 prose max-w-none">
                                    {section === 'Mô tả công việc' && <p>{job.description}</p>}
                                    {section === 'Yêu cầu ứng viên' && <ul className="pl-5 list-disc">{job.requirements.map(req => <li key={req}>{req}</li>)}</ul>}
                                    {section === 'Lịch làm việc & Ca trực' && <p>{job.schedule}</p>}
                                </div>
                            </div>
                        ))}
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-3 border-b-2 pb-2">Đánh giá & Trải nghiệm</h4>
                            <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                                {visibleReviews.length > 0 ? visibleReviews.map((r, i) => (
                                    <div key={i} className="bg-gray-100 p-3 rounded-lg text-sm">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-gray-900">{r.author}</p>
                                            <Rating rating={r.rating} />
                                        </div>
                                        <p className="text-slate-800 font-medium mt-1.5">"{r.comment}"</p>
                                    </div>
                                )) : <p className="text-sm text-gray-500 italic">Chưa có đánh giá nào được duyệt.</p>}
                            </div>
                             <form onSubmit={handleReviewSubmit} className="mt-6 bg-gray-100 p-4 rounded-lg">
                                 <h5 className="font-semibold text-gray-900 text-base mb-2">Gửi đánh giá của bạn</h5>
                                 <div className="flex items-center mb-3">
                                     <span className="text-sm mr-3 text-gray-900">Xếp hạng của bạn:</span>
                                     <div className="flex" onMouseLeave={() => setHoverRating(0)}>{[1, 2, 3, 4, 5].map(i => <StarIcon key={i} filled={i <= (hoverRating || currentRating)} onClick={() => setCurrentRating(i)} onMouseEnter={() => setHoverRating(i)} className="w-6 h-6 cursor-pointer" />)}</div>
                                 </div>
                                 <textarea onChange={(e) => newReviewRef.current.comment = e.target.value} placeholder="Chia sẻ trải nghiệm của bạn về công việc này..." className="w-full border-gray-300 rounded-md text-sm p-2 placeholder:text-gray-600" rows={3}></textarea>
                                 <button type="submit" className="mt-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">Gửi đánh giá</button>
                             </form>
                        </div>
                    </div>
                    <div className="md:col-span-1 bg-slate-50 p-4 rounded-lg space-y-4 self-start sticky top-0">
                        <div className="pb-4 border-b">
                            <h4 className="text-lg font-bold text-gray-900 mb-3 border-b-2 pb-2">Thông tin chung</h4>
                            <div className="text-base space-y-2 text-gray-900">
                                <p><strong>Mức lương:</strong> <span className="text-green-600 font-bold">{job.salary}</span></p>
                                <p><strong>Phúc lợi:</strong> {job.benefits.join(', ')}</p>
                                <p><strong>Email:</strong> {job.recruiter.email}</p>
                                <p><strong>Hotline:</strong> {job.recruiter.hotline}</p>
                            </div>
                        </div>
                        <div className="pb-4 border-b">
                            <h4 className="text-lg font-bold text-gray-900 mb-3 border-b-2 pb-2">Vị trí & Địa điểm</h4>
                            <p className="text-base text-gray-900 mb-2"><strong>Nơi làm việc:</strong> {job.location}</p>
                            <a href={`https://www.google.com/maps?q=${job.workLocationGps[0]},${job.workLocationGps[1]}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">Xem bản đồ nơi làm việc</a>
                            <div className="mt-3">
                                <button onClick={() => setShowInterviewMap(!showInterviewMap)} className="text-sm font-semibold w-full text-left flex justify-between items-center">
                                   Địa chỉ phỏng vấn
                                    <svg className={`w-4 h-4 transition-transform ${showInterviewMap ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                                {showInterviewMap && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        <p>{job.recruiter.officeLocation}</p>
                                        <img 
                                            src={`https://maps.googleapis.com/maps/api/staticmap?center=${job.recruiter.officeGps[0]},${job.recruiter.officeGps[1]}&zoom=15&size=400x150&markers=color:blue%7Clabel:P%7C${job.recruiter.officeGps[0]},${job.recruiter.officeGps[1]}&key=${googleApiKey}`}
                                            alt="Bản đồ vị trí phỏng vấn"
                                            className="w-full rounded-md object-cover border mt-1"
                                        />
                                         <a href={`https://www.google.com/maps?q=${job.recruiter.officeGps[0]},${job.recruiter.officeGps[1]}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Mở trong Google Maps</a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                             {currentUser?.role === 'jobseeker' && (
                                <CvSubmissionForm job={job} currentUser={currentUser} applications={applications} onSubmit={handleCvSubmit} showToast={showToast} />
                            )}
                            {job.isVerified && <div className="flex items-center text-sm p-2 bg-green-100 text-green-800 font-medium rounded-md mb-3 mt-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Nhà tuyển dụng đã xác minh</div>}
                            <button onClick={() => handleStartPrivateChat(job)} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span>Chat với Nhà tuyển dụng</span></button>
                            <button onClick={() => handleOpenReportModal(job)} className="w-full bg-red-100 text-red-700 py-2 rounded-lg text-sm hover:bg-red-200 flex items-center justify-center space-x-2 mt-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 01-1-1V6z" clipRule="evenodd" /></svg><span>Báo cáo tin đăng</span></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const JobPostingModal = ({ onClose, onPost, currentUser }: { onClose: () => void, onPost: (jobData: Omit<Job, 'id' | 'rating' | 'reviewCount' | 'reviews' | 'postedDate' | 'isFeatured' | 'companyId'>, isFeatured: boolean) => void, currentUser: CurrentUser }) => {
    const [formData, setFormData] = useState<any>({ company: "Công ty TNHH ABC", title: "Nhân viên Marketing", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg", location: "123 Đường ABC, Quận 1", workLocationGps: [10.7769, 106.7009], salary: "Thoả thuận", benefits: "BHXH, Lương tháng 13", description: "Mô tả công việc...", schedule: "Giờ hành chính", requirements: "Yêu cầu...", industry: "Marketing", employmentType: "Toàn thời gian", recruiterEmail: "hr@abc.com", recruiterHotline: "0123456789", recruiterOfficeLocation: "456 Đường XYZ, Quận 3", recruiterOfficeGpsLink: "https://www.google.com/maps?q=10.7800,106.6900" });
    const [logoPreview, setLogoPreview] = useState<string | null>(formData.logo);
    const [formErrors, setFormErrors] = useState<any>({});
    const [postingType, setPostingType] = useState<'standard' | 'featured'>('standard');

    useEffect(() => {
        if (currentUser) {
            setFormData(prev => ({
                ...prev,
                company: currentUser.name,
                recruiterEmail: currentUser.email,
                recruiterHotline: currentUser.phone,
            }));
        }
    }, [currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);
            setLogoPreview(previewUrl);
            setFormData({ ...formData, logo: previewUrl });
        }
    };

    const validateAndParseGpsLink = (link: string): [number, number] | null => {
        if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) {
            return null;
        }
        try {
            const url = new URL(link);
            const q = url.searchParams.get('q');
            if (q) {
                const [lat, lng] = q.split(',').map(Number);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return [lat, lng];
                }
            }
            const pathnameParts = url.pathname.split('/@');
            if (pathnameParts.length > 1) {
                const [lat, lng] = pathnameParts[1].split(',').slice(0, 2).map(Number);
                 if (!isNaN(lat) && !isNaN(lng)) {
                    return [lat, lng];
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: any = {};
        if (!formData.recruiterEmail) errors.recruiterEmail = "Bắt buộc.";
        if (!formData.salary) errors.salary = "Bắt buộc.";
        if (!formData.benefits) errors.benefits = "Bắt buộc.";
        if (!formData.description) errors.description = "Bắt buộc.";
        if (!formData.schedule) errors.schedule = "Bắt buộc.";
        if (!formData.requirements) errors.requirements = "Bắt buộc.";
        
        const parsedGps = validateAndParseGpsLink(formData.recruiterOfficeGpsLink);
        if (!parsedGps) {
            errors.recruiterOfficeGpsLink = "Link Google Maps không hợp lệ hoặc không chứa tọa độ.";
        }

        setFormErrors(errors);

        if (Object.keys(errors).length === 0 && parsedGps) {
             onPost({
                 ...formData,
                 isVerified: false, // New posts are not verified by default
                 benefits: formData.benefits.split(',').map((s:string) => s.trim()),
                 requirements: formData.requirements.split('\n').map((s:string) => s.trim()),
                 recruiter: {
                     name: `Phòng nhân sự ${formData.company}`,
                     email: formData.recruiterEmail,
                     hotline: formData.recruiterHotline,
                     officeLocation: formData.recruiterOfficeLocation,
                     officeGps: parsedGps
                 },
             }, postingType === 'featured');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-[95%] md:w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 p-5 border-b">Đăng tin tuyển dụng mới</h2>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                     <h3 className="font-semibold border-b pb-1">Chọn loại tin đăng</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`border rounded-lg p-4 cursor-pointer ${postingType === 'standard' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}>
                            <input type="radio" name="postingType" value="standard" checked={postingType === 'standard'} onChange={() => setPostingType('standard')} className="sr-only" />
                            <h4 className="font-bold">Tin Thường</h4>
                            <p className="text-sm text-gray-600">Tin của bạn sẽ được hiển thị theo thời gian đăng.</p>
                            <p className="font-bold text-lg mt-2">Miễn phí</p>
                        </label>
                         <label className={`border rounded-lg p-4 cursor-pointer ${postingType === 'featured' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-300'}`}>
                            <input type="radio" name="postingType" value="featured" checked={postingType === 'featured'} onChange={() => setPostingType('featured')} className="sr-only" />
                            <h4 className="font-bold text-yellow-600">Tin Nổi Bật (Ưu tiên)</h4>
                            <p className="text-sm text-gray-600">Ghim lên đầu trong 7 ngày, tiếp cận nhiều ứng viên hơn.</p>
                            <p className="font-bold text-lg mt-2 text-blue-600">99,000đ</p>
                        </label>
                     </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                         <div className="md:col-span-1 flex flex-col items-center">
                            {logoPreview && <img src={logoPreview} alt="Logo Preview" className="w-24 h-24 object-contain rounded-md border p-1 mb-2"/>}
                            <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-800 mb-1">Logo/Ảnh thương hiệu</label>
                            <input type="file" id="logoUpload" accept="image/*" onChange={handleLogoChange} className="text-sm w-full" />
                         </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-gray-800 mb-1">Tên công ty</label>
                                <input type="text" name="company" id="company" value={formData.company} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-800 mb-1">Vị trí tuyển dụng</label>
                                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                            </div>
                        </div>
                    </div>

                     <h3 className="font-semibold border-b pt-4 pb-1">Thông tin chung</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="recruiterEmail" className="block text-sm font-medium text-gray-800 mb-1">Email nhà tuyển dụng <span className="text-red-500">*</span></label>
                            <input type="email" name="recruiterEmail" id="recruiterEmail" value={formData.recruiterEmail} onChange={handleChange} className="w-full border-gray-300 rounded-md" /> 
                            {formErrors.recruiterEmail && <p className="text-red-500 text-xs mt-1">{formErrors.recruiterEmail}</p>}
                        </div>
                        <div>
                            <label htmlFor="recruiterHotline" className="block text-sm font-medium text-gray-800 mb-1">Số điện thoại</label>
                            <input type="tel" name="recruiterHotline" id="recruiterHotline" value={formData.recruiterHotline} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="salary" className="block text-sm font-medium text-gray-800 mb-1">Mức lương <span className="text-red-500">*</span></label>
                            <input type="text" name="salary" id="salary" value={formData.salary} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                            {formErrors.salary && <p className="text-red-500 text-xs mt-1">{formErrors.salary}</p>}
                        </div>
                         <div>
                            <label htmlFor="benefits" className="block text-sm font-medium text-gray-800 mb-1">Phúc lợi <span className="text-red-500">*</span></label>
                            <input type="text" name="benefits" id="benefits" value={formData.benefits} onChange={handleChange} className="w-full border-gray-300 rounded-md" placeholder="Cách nhau bởi dấu phẩy" />
                            {formErrors.benefits && <p className="text-red-500 text-xs mt-1">{formErrors.benefits}</p>}
                        </div>
                     </div>
                     
                     <h3 className="font-semibold border-b pt-4 pb-1">Chi tiết công việc</h3>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-800 mb-1">Mô tả công việc <span className="text-red-500">*</span></label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={4} className="w-full border-gray-300 rounded-md"></textarea>
                        {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                     </div>
                     <div>
                        <label htmlFor="requirements" className="block text-sm font-medium text-gray-800 mb-1">Yêu cầu ứng viên <span className="text-red-500">*</span></label>
                        <textarea name="requirements" id="requirements" value={formData.requirements} onChange={handleChange} rows={3} className="w-full border-gray-300 rounded-md" placeholder="Mỗi yêu cầu một dòng"></textarea>
                        {formErrors.requirements && <p className="text-red-500 text-xs mt-1">{formErrors.requirements}</p>}
                     </div>
                     <div>
                        <label htmlFor="schedule" className="block text-sm font-medium text-gray-800 mb-1">Lịch làm ca trực <span className="text-red-500">*</span></label>
                        <input type="text" name="schedule" id="schedule" value={formData.schedule} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                        {formErrors.schedule && <p className="text-red-500 text-xs mt-1">{formErrors.schedule}</p>}
                     </div>

                     <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md mr-2">Hủy</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">{postingType === 'standard' ? 'Đăng tin' : 'Tiếp tục thanh toán'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PaymentModal = ({ jobData, onClose, onSuccess, showToast }: { jobData: any, onClose: () => void, onSuccess: () => void, showToast: (message: string) => void }) => {
    const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'transfer'>('vnpay');
    const [isProcessing, setIsProcessing] = useState(false); // For VNPAY redirect simulation
    const [isWaitingForTransfer, setIsWaitingForTransfer] = useState(false); // For transfer confirmation simulation
    const transferContent = useMemo(() => `WH ${Date.now()}`, []);
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast("Đã sao chép!");
    };

    const handleVnpayRedirect = () => {
        setIsProcessing(true);
        setTimeout(() => {
            onSuccess();
        }, 2500);
    };

    const handleConfirmTransfer = () => {
        setIsWaitingForTransfer(true);
        setTimeout(() => {
            onSuccess();
        }, 4000);
    };
    
    const vietQRUrl = `https://img.vietqr.io/image/970436-1037138930-compact.png?amount=99000&addInfo=${encodeURIComponent(transferContent)}&accountName=MAI%20DUY%20KHANG`;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 p-5 border-b">Xác nhận thanh toán</h2>
                <div className="p-6">
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-gray-600">Gói dịch vụ:</p>
                        <p className="font-semibold text-lg text-gray-800">Tin Nổi Bật - {jobData.title}</p>
                        <div className="text-right text-2xl font-bold text-blue-600 mt-2">99,000đ</div>
                    </div>

                    <div className="flex border-b mb-4">
                        <button onClick={() => setPaymentMethod('vnpay')} className={`flex-1 py-2 text-sm font-semibold ${paymentMethod === 'vnpay' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Thanh toán VNPAY</button>
                        <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-2 text-sm font-semibold ${paymentMethod === 'transfer' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Chuyển khoản VietQR</button>
                    </div>
                    
                    {paymentMethod === 'vnpay' && (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-gray-600">Bạn sẽ được chuyển hướng đến cổng thanh toán VNPAY an toàn để hoàn tất giao dịch.</p>
                            <img src="https://vnpay.vn/assets/images/logo-vnpay-qr-1.png" alt="VNPAY Logo" className="mx-auto h-12 my-2"/>
                            <button onClick={handleVnpayRedirect} disabled={isProcessing} className="w-full bg-blue-600 text-white py-2.5 rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-300 flex justify-center items-center">
                                 {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <span>Đang chuyển hướng...</span>
                                    </>
                                 ) : (
                                    'Thanh toán qua VNPAY'
                                 )}
                            </button>
                        </div>
                    )}
                    {paymentMethod === 'transfer' && !isWaitingForTransfer && (
                         <div className="text-sm">
                            <h3 className="font-semibold text-base text-gray-900 text-center mb-2">Chuyển khoản qua VietQR</h3>
                            <p className="text-gray-600 text-center mb-4">Mở ứng dụng Ngân hàng và quét mã QR để thanh toán nhanh chóng và chính xác.</p>
                            <div className="flex justify-center mb-4">
                                 <img src={vietQRUrl} alt="VietQR Code" className="w-48 h-48 border rounded-lg p-1"/>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-md space-y-2 text-gray-900 text-xs">
                                <p><strong>Ngân hàng:</strong> Vietcombank</p>
                                <p><strong>Số tài khoản:</strong> 1037138930</p>
                                <p><strong>Tên người nhận:</strong> MAI DUY KHANG <span className="text-gray-500 italic">(Tên hiển thị tự động khi chuyển khoản, không thay đổi)</span></p>
                                <div className="flex justify-between items-center pt-1 mt-1 border-t">
                                    <span className="font-bold">Số tiền: <span className="text-red-600">99,000đ</span></span>
                                    <button onClick={() => handleCopy('99000')} className="p-1 text-gray-500 hover:text-blue-600 rounded" aria-label="Sao chép số tiền"><CopyIcon className="w-4 h-4" /></button>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold">Nội dung: <span className="text-red-600">{transferContent}</span></span>
                                    <button onClick={() => handleCopy(transferContent)} className="p-1 text-gray-500 hover:text-blue-600 rounded" aria-label="Sao chép nội dung"><CopyIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <button onClick={handleConfirmTransfer} className="w-full bg-blue-600 text-white py-2.5 rounded-md font-semibold hover:bg-blue-700 mt-4">Tôi đã chuyển khoản</button>
                        </div>
                    )}
                    {paymentMethod === 'transfer' && isWaitingForTransfer && (
                        <div className="text-center py-8">
                           <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           <p className="mt-3 font-semibold text-gray-700">Đang chờ xác nhận thanh toán...</p>
                           <p className="text-sm text-gray-500">Hệ thống đang đối soát giao dịch của bạn. Vui lòng chờ trong giây lát.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EditJobModal = ({ job, onClose, onUpdate, showToast }: { job: Job, onClose: () => void, onUpdate: (updatedJob: Job) => void, showToast: (message: string) => void }) => {
    const [formData, setFormData] = useState<Job>(job);

    useEffect(() => {
        setFormData(job);
    }, [job]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Convert requirements/benefits back to array if they are strings
        const updatedJob = {
            ...formData,
            requirements: typeof formData.requirements === 'string' ? (formData.requirements as string).split('\n') : formData.requirements,
            benefits: typeof formData.benefits === 'string' ? (formData.benefits as string).split(',') : formData.benefits,
        };
        onUpdate(updatedJob);
        onClose();
        showToast("Cập nhật tin đăng thành công!");
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-[95%] md:w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 p-5 border-b">Chỉnh sửa tin đăng</h2>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Vị trí tuyển dụng</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Tên công ty</label>
                        <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Địa chỉ (Nơi làm việc)</label>
                        <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Mức lương</label>
                        <input type="text" name="salary" value={formData.salary} onChange={handleChange} className="w-full border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Mô tả công việc</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full border-gray-300 rounded-md"></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Gói dịch vụ</label>
                         <label className="flex items-center p-3 border rounded-md bg-gray-50">
                            <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" />
                            <span className="ml-3 font-semibold text-yellow-700">Tin Nổi Bật (Ưu tiên)</span>
                        </label>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md mr-2">Hủy</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Lưu thay đổi</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MainContent = ({ filters, handleFilterChange, uniqueIndustries, showOnlySaved, setShowOnlySaved, filteredJobs, setSelectedJob, savedJobIds, toggleSaveJob }: { filters: any, handleFilterChange: (e: any) => void, uniqueIndustries: string[], showOnlySaved: boolean, setShowOnlySaved: (show: boolean) => void, filteredJobs: Job[], setSelectedJob: (job: Job | null) => void, savedJobIds: Set<number>, toggleSaveJob: (jobId: number) => void }) => (
     <main className="container mx-auto p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md mb-6" role="alert">
            <p className="font-bold">Cảnh báo an toàn!</p>
            <p className="text-sm">Luôn check địa chỉ cụ thể trước khi đi phỏng vấn. Không bao giờ nộp bất kỳ khoản phí nào. Nếu thấy tin đăng đáng ngờ, hãy báo cáo ngay cho chúng tôi.</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                   <label htmlFor="keyword" className="text-sm font-medium text-gray-700">Tên công việc, công ty, địa điểm</label>
                   <input type="text" name="keyword" id="keyword" value={filters.keyword} onChange={handleFilterChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="VD: Nhân viên bán hàng quận 1"/>
               </div>
                <div>
                   <label htmlFor="industry" className="text-sm font-medium text-gray-700">Ngành nghề</label>
                    <select name="industry" id="industry" value={filters.industry} onChange={handleFilterChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Tất cả</option>
                        {uniqueIndustries.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
               </div>
               <div>
                   <label htmlFor="salary" className="text-sm font-medium text-gray-700">Mức lương</label>
                    <select name="salary" id="salary" value={filters.salary} onChange={handleFilterChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Tất cả</option>
                        <option value="0-5">Dưới 5 triệu</option>
                        <option value="5-10">5 - 10 triệu</option>
                        <option value="10-15">10 - 15 triệu</option>
                    </select>
               </div>
            </div>
             <div className="mt-4 pt-4 border-t">
                <label className="flex items-center text-sm text-gray-700">
                    <input type="checkbox" checked={showOnlySaved} onChange={(e) => setShowOnlySaved(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2">Chỉ hiển thị công việc đã lưu</span>
                </label>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredJobs.map(job => (
                 <div key={job.id} className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col justify-between overflow-hidden relative ${job.isFeatured ? 'border-2 border-yellow-400' : 'border'}`}>
                     {job.isFeatured && <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-br-lg z-10">ƯU TIÊN</div>}
                     <button onClick={(e) => { e.stopPropagation(); toggleSaveJob(job.id); }} className="absolute top-2 right-2 p-1 z-10 rounded-full bg-white/50 hover:bg-white/90" aria-label="Lưu việc làm">
                         <BookmarkIcon saved={savedJobIds.has(job.id)} />
                     </button>
                     <div onClick={() => setSelectedJob(job)} className="cursor-pointer">
                         <div className="p-5">
                           <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-4">
                                   <img src={job.logo} alt={job.company} className="w-14 h-14 object-contain rounded-md border p-1 bg-white" />
                                   <div>
                                       <h3 className="font-bold text-gray-800 leading-tight hover:text-blue-600 text-base pr-8">{job.title}</h3>
                                       <p className="text-sm text-gray-700 font-semibold">{job.company}</p>
                                   </div>
                                </div>
                           </div>
                            <div className="space-y-2 text-sm text-gray-800">
                                <p className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg> {job.location}</p>
                                <p className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 004.998 0V7.151c.22.071.409.164.567.267C15.483 8.048 16 9.138 16 10.5c0 1.657-1.343 3-3 3s-3-1.343-3-3c0-1.362.517-2.452 1.433-3.082z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg> <span className="font-semibold text-green-600">{job.salary}</span></p>
                            </div>
                         </div>
                         <div className="bg-gray-50 px-5 py-3 border-t flex justify-between items-center text-xs text-gray-500">
                             <Rating rating={job.rating} count={job.reviewCount} />
                             <span>{job.postedDate}</span>
                         </div>
                     </div>
                </div>
            ))}
             {filteredJobs.length === 0 && (
                <div className="col-span-full text-center py-10">
                    <p className="text-gray-500">{showOnlySaved ? "Bạn chưa lưu công việc nào." : "Không tìm thấy công việc phù hợp."}</p>
                </div>
            )}
        </div>
    </main>
);

const AuthPage = ({ children, title, onBack }: { children: React.ReactNode, title: string, onBack?: () => void }) => (
    <main className="container mx-auto p-6 flex justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md mt-10 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
                 <div className="flex items-center justify-center relative">
                    {onBack && (
                        <button onClick={onBack} className="absolute left-0 text-gray-500 hover:text-gray-800 p-2 rounded-full" aria-label="Quay lại">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-center text-gray-800">{title}</h1>
                </div>
            </div>
            <div className="p-8">
                 {children}
            </div>
        </div>
    </main>
);

const LoginPage = ({ handleLogin, showToast, setView, users }: { handleLogin: (email: string, pass: string) => boolean, showToast: (message: string) => void, setView: (view: AppView) => void, users: User[] }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleLogin(email, password);
  };

  const handleFacebookLogin = () => {
    const fbUser = users.find(u => u.email === 'hr@thecoffeehouse.vn');
    if (fbUser) {
        handleLogin(fbUser.email, 'hashed_password_123');
    } else {
        showToast("Tài khoản Facebook chưa được liên kết. Vui lòng đăng ký.");
        setView('signup');
    }
  };

  return (
      <AuthPage title="Đăng nhập" onBack={() => setView('main')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
          </div>
          <div className="text-right">
            <button type="button" onClick={() => showToast("Chức năng đang được phát triển.")} className="text-sm text-blue-600 hover:underline">Quên mật khẩu?</button>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold">Đăng nhập</button>
        </form>
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Hoặc</span></div>
        </div>
        <button onClick={handleFacebookLogin} className="w-full bg-blue-800 text-white py-2 rounded-md font-semibold flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" /></svg>
          Đăng nhập bằng Facebook
        </button>
        <p className="text-center text-sm text-gray-600 mt-6">
          Chưa có tài khoản? <button onClick={() => setView('signup')} className="font-medium text-blue-600 hover:underline">Đăng ký ngay</button>
        </p>
        <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
                Dành cho quản trị viên? <button type="button" onClick={(e) => { e.preventDefault(); window.location.hash = 'secure-panel-49cax'; }} className="font-medium text-gray-600 hover:underline">Đăng nhập tại đây</button>.
            </p>
        </div>
      </AuthPage>
  );
};

const SignupPage = ({ handleSignup, setView, showToast }: { handleSignup: (data: any) => boolean, setView: (view: AppView) => void, showToast: (message: string) => void }) => {
    const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '', phone: '', role: 'jobseeker' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showToast("Mật khẩu không khớp!");
            return;
        }
        const { confirmPassword, ...signupData } = formData;
        handleSignup(signupData);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleRoleChange = (role: 'jobseeker' | 'employer') => setFormData(prev => ({ ...prev, role }));

    return (
         <AuthPage title="Đăng ký tài khoản" onBack={() => setView('main')}>
            <div className="grid grid-cols-2 gap-2 rounded-md p-1 bg-gray-100 mb-6">
                <button type="button" onClick={() => handleRoleChange('jobseeker')} className={`px-4 py-1.5 text-sm font-semibold rounded ${formData.role === 'jobseeker' ? 'bg-white shadow' : 'text-gray-600'}`}>Người tìm việc</button>
                <button type="button" onClick={() => handleRoleChange('employer')} className={`px-4 py-1.5 text-sm font-semibold rounded ${formData.role === 'employer' ? 'bg-white shadow' : 'text-gray-600'}`}>Nhà tuyển dụng</button>
            </div>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" onChange={handleChange} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700">{formData.role === 'employer' ? 'Tên công ty' : 'Họ và tên'}</label>
                <input type="text" name="name" onChange={handleChange} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700">Số điện thoại liên hệ</label>
                <input type="tel" name="phone" onChange={handleChange} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <input type="password" name="password" onChange={handleChange} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
                <input type="password" name="confirmPassword" onChange={handleChange} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold">Đăng ký</button>
          </form>
           <p className="text-center text-sm text-gray-600 mt-6">
            Đã có tài khoản? <button onClick={() => setView('login')} className="font-medium text-blue-600 hover:underline">Đăng nhập</button>
          </p>
        </AuthPage>
    );
};

const EmployerDashboard = ({ currentUser, jobs, payments, privateChats, users, handleEditJob, handleDeleteJob, openPrivateChat }: { currentUser: CurrentUser, jobs: Job[], payments: Payment[], privateChats: PrivateChatSession[], users: User[], handleEditJob: (job: Job) => void, handleDeleteJob: (jobId: number) => void, openPrivateChat: (sessionId: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'payments' | 'inbox'>('jobs');
  if (!currentUser) return null;

  const myJobs = jobs.filter(job => job.companyId === currentUser.id);
  const myPayments = payments.filter(p => p.userId === currentUser.id);
  const myChats = privateChats.filter(chat => chat.participants.employerId === currentUser.id);

  return (
    <main className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Employer Dashboard</h1>
        <p className="text-gray-600 mb-6">Quản lý tin đăng và xem lịch sử thanh toán của bạn.</p>
        <div className="flex border-b mb-6">
            <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'jobs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}>Quản lý tin đăng</button>
            <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'payments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}>Lịch sử thanh toán</button>
            <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'inbox' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}>Hộp thư</button>
        </div>
        {activeTab === 'jobs' && (
            <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Tin đăng của bạn ({myJobs.length})</h2>
                <div className="space-y-3">
                    {myJobs.map(job => (
                        <div key={job.id} className="border p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-900">{job.title} {job.isFeatured && <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full ml-2">ƯU TIÊN</span>}</p>
                                <p className="text-sm text-gray-600">{job.location} - Đăng ngày: {job.postedDate}</p>
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => handleEditJob(job)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Sửa</button>
                                <button onClick={() => handleDeleteJob(job.id)} className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Xóa</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
         {activeTab === 'payments' && (
             <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Lịch sử giao dịch</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-3 font-semibold tracking-wider">Mã GD</th>
                                <th className="p-3 font-semibold tracking-wider">Ngày</th>
                                <th className="p-3 font-semibold tracking-wider">Dịch vụ</th>
                                <th className="p-3 font-semibold tracking-wider text-right">Số tiền</th>
                                <th className="p-3 font-semibold tracking-wider text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {myPayments.map(p => (
                                <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-3 font-mono text-gray-800 font-medium">{p.id}</td>
                                    <td className="p-3">{p.date}</td>
                                    <td className="p-3">{p.service}</td>
                                    <td className="p-3 text-right font-semibold text-gray-900">{p.amount.toLocaleString('vi-VN')}đ</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                                    </td>
                                </tr>
                            ))}
                             {myPayments.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-4 text-gray-500">Chưa có giao dịch nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
        )}
        {activeTab === 'inbox' && (
             <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Hộp thư ({myChats.length})</h2>
                <div className="space-y-3">
                    {myChats.length > 0 ? myChats.map(chat => {
                        const applicant = users.find(u => u.id === chat.participants.applicantId);
                        const job = jobs.find(j => j.id === chat.jobId);
                        return (
                            <div key={chat.sessionId} onClick={() => openPrivateChat(chat.sessionId)} className="border p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-50">
                                <div>
                                    <p className="font-bold">Chat với {applicant?.name || 'Không rõ'}</p>
                                    <p className="text-sm text-gray-500">Về tin đăng: {job?.title || 'Không rõ'}</p>
                                </div>
                                <button className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Xem tin nhắn</button>
                            </div>
                        );
                    }) : <p className="text-gray-500">Bạn chưa có cuộc hội thoại nào.</p>}
                </div>
            </div>
        )}
    </main>
  );
};

const AdminDashboard = ({ currentUser, setView, users, jobs, reports, actionLogs, toggleUserLock, deleteJob, showToast, handleOpenEditModal, handleReportAction, handleReviewStatusChange }: { currentUser: CurrentUser, setView: (view: AppView) => void, users: User[], jobs: Job[], reports: Report[], actionLogs: ActionLog[], toggleUserLock: (userId: number) => void, deleteJob: (jobId: number) => void, showToast: (message: string) => void, handleOpenEditModal: (job: Job) => void, handleReportAction: (reportId: number, action: 'resolve') => void, handleReviewStatusChange: (jobId: number, reviewIndex: number, newStatus: Review['status']) => void }) => {
    const [activeTab, setActiveTab] = useState<'jobs' | 'users' | 'moderation' | 'logs'>('jobs');
    if (!currentUser || currentUser.role !== 'admin') {
        setView('main');
        return null;
    }
    
    const allReviews = useMemo(() => jobs.flatMap(job => job.reviews.map((review, index) => ({ ...review, jobId: job.id, jobTitle: job.title, reviewIndex: index }))), [jobs]);

    const renderStatusLabel = (status: Review['status']) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            visible: 'bg-green-100 text-green-800',
            hidden: 'bg-red-100 text-red-800',
        };
        const text = {
            pending: 'Chờ duyệt',
            visible: 'Đã duyệt',
            hidden: 'Đã ẩn'
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{text[status]}</span>;
    };

    return (
        <main className="container mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 mb-6">Quản lý toàn bộ hệ thống. Chào mừng đến với <code className="bg-gray-200 text-sm p-1 rounded">/secure-panel-49cax/dashboard</code></p>
             <div className="flex border-b mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('jobs')} className={`flex-shrink-0 px-4 py-2 text-sm font-semibold ${activeTab === 'jobs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}>Quản lý tin đăng</button>
                <button onClick={() => setActiveTab('users')} className={`flex-shrink-0 px-4 py-2 text-sm font-semibold ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}>Quản lý người dùng</button>
                <button onClick={() => setActiveTab('moderation')} className={`flex-shrink-0 px-4 py-2 text-sm font-semibold ${activeTab === 'moderation' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}>Báo cáo & Đánh giá</button>
                <button onClick={() => setActiveTab('logs')} className={`flex-shrink-0 px-4 py-2 text-sm font-semibold ${activeTab === 'logs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}>Nhật ký hành động</button>
            </div>

            {activeTab === 'jobs' && (
                <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-4">Tất cả tin đăng ({jobs.length})</h2>
                    <table className="w-full text-sm text-left whitespace-nowrap">
                       <thead className="bg-gray-50 text-gray-800 font-bold"><tr><th className="p-2">Tiêu đề</th><th className="p-2">Công ty</th><th className="p-2">Gói dịch vụ</th><th className="p-2">Hành động</th></tr></thead>
                       <tbody>
                           {jobs.map(job => (
                               <tr key={job.id} className="border-b text-gray-900"><td className="p-2 font-semibold">{job.title}</td><td className="p-2">{job.company}</td><td className="p-2"><span className={`px-2 py-1 rounded-full text-xs ${job.isFeatured ? 'bg-yellow-100 text-yellow-800 font-medium' : 'bg-gray-100 text-gray-800'}`}>{job.isFeatured ? 'Ưu tiên' : 'Thường'}</span></td><td className="p-2 space-x-2"><button onClick={() => handleOpenEditModal(job)} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Sửa</button><button onClick={() => deleteJob(job.id)} className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Xóa vĩnh viễn</button></td></tr>
                           ))}
                       </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'users' && (
                <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                     <h2 className="text-xl font-semibold mb-4">Tất cả người dùng ({users.length})</h2>
                     <table className="w-full text-sm text-left whitespace-nowrap">
                       <thead className="bg-gray-50 text-gray-800 font-bold"><tr><th className="p-2">Tên</th><th className="p-2">Email</th><th className="p-2">Vai trò</th><th className="p-2">Trạng thái</th><th className="p-2">Hành động</th></tr></thead>
                       <tbody>
                           {users.map(user => (
                               <tr key={user.id} className="border-b text-gray-900"><td className="p-2 font-semibold">{user.name}</td><td className="p-2">{user.email}</td><td className="p-2">{user.role}</td><td className="p-2"><span className={`px-2 py-1 rounded-full text-xs ${!user.isLocked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{!user.isLocked ? 'Hoạt động' : 'Đã khóa'}</span></td><td className="p-2 space-x-2"><button className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Xem chi tiết</button><button onClick={() => toggleUserLock(user.id)} className={`text-sm px-3 py-1 rounded ${user.isLocked ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}>{user.isLocked ? 'Mở khóa' : 'Khóa TK'}</button></td></tr>
                           ))}
                       </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'moderation' && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                         <h2 className="text-xl font-semibold mb-4">Báo cáo cần xử lý ({reports.filter(r => r.status === 'pending').length})</h2>
                         <table className="w-full text-sm text-left whitespace-nowrap">
                           <thead className="bg-gray-50 text-gray-800 font-bold"><tr><th className="p-2">Tin đăng</th><th className="p-2">Lý do</th><th className="p-2">Chi tiết</th><th className="p-2">Hành động</th></tr></thead>
                           <tbody>
                               {reports.filter(r => r.status === 'pending').map(report => (
                                   <tr key={report.id} className="border-b text-gray-900"><td className="p-2 font-semibold">{report.jobTitle}</td><td className="p-2">{report.reason}</td><td className="p-2 truncate max-w-xs">{report.details || "N/A"}</td><td className="p-2"><button onClick={() => handleReportAction(report.id, 'resolve')} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Xử lý & Xóa</button></td></tr>
                               ))}
                               {reports.filter(r => r.status === 'pending').length === 0 && (<tr><td colSpan={4} className="p-4 text-center text-gray-500">Không có báo cáo nào.</td></tr>)}
                           </tbody>
                        </table>
                    </div>
                     <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                         <h2 className="text-xl font-semibold mb-4">Kiểm duyệt đánh giá ({allReviews.length})</h2>
                          <table className="w-full text-sm text-left whitespace-nowrap">
                           <thead className="bg-gray-50 text-gray-800 font-bold"><tr><th className="p-2">Đánh giá</th><th className="p-2">Tin đăng</th><th className="p-2">Trạng thái</th><th className="p-2">Hành động</th></tr></thead>
                           <tbody>
                               {allReviews.map(review => (
                                   <tr key={`${review.jobId}-${review.reviewIndex}`} className="border-b text-gray-900">
                                        <td className="p-2 italic">"{review.comment}"</td><td className="p-2 font-semibold">{review.jobTitle}</td><td className="p-2">{renderStatusLabel(review.status)}</td>
                                        <td className="p-2 space-x-2">
                                            {review.status !== 'visible' && <button onClick={() => handleReviewStatusChange(review.jobId, review.reviewIndex, 'visible')} className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Phê duyệt</button>}
                                            {review.status !== 'hidden' && <button onClick={() => handleReviewStatusChange(review.jobId, review.reviewIndex, 'hidden')} className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Ẩn</button>}
                                        </td>
                                   </tr>
                               ))}
                           </tbody>
                        </table>
                    </div>
                </div>
            )}
            {activeTab === 'logs' && (
                <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-4">Nhật ký hành động Admin</h2>
                    <table className="w-full text-sm text-left whitespace-nowrap">
                       <thead className="bg-gray-50 text-gray-800 font-bold"><tr><th className="p-2">Thời gian</th><th className="p-2">Admin</th><th className="p-2">Hành động</th><th className="p-2">Địa chỉ IP</th></tr></thead>
                       <tbody>
                           {actionLogs.map(log => (
                               <tr key={log.id} className="border-b text-gray-900"><td className="p-2">{log.timestamp}</td><td className="p-2">{log.adminName} ({log.adminId})</td><td className="p-2">{log.action}</td><td className="p-2 font-mono">{log.ipAddress}</td></tr>
                           ))}
                            {actionLogs.length === 0 && (<tr><td colSpan={4} className="p-4 text-center text-gray-500">Chưa có hành động nào được ghi lại.</td></tr>)}
                       </tbody>
                    </table>
                </div>
            )}
        </main>
    );
};

const ForbiddenPage = ({ onSimulateTrustedIp }: { onSimulateTrustedIp: () => void }) => (
    <main className="container mx-auto p-6 flex justify-center items-center h-[calc(100vh-68px)]">
        <div className="text-center bg-white p-10 rounded-lg shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h1 className="text-3xl font-bold text-red-600 mt-4 mb-2">403 - Truy cập bị cấm</h1>
            <p className="text-gray-700 mb-6">Địa chỉ IP của bạn không có trong danh sách được phép truy cập vào khu vực quản trị.</p>
            <button
                onClick={onSimulateTrustedIp}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
            >
                (Dev) Giả lập IP tin cậy
            </button>
        </div>
    </main>
);

const PrivateChatModal = ({ session, currentUser, users, job, onClose, onSendMessage }: { session: PrivateChatSession, currentUser: CurrentUser, users: User[], job: Job | undefined, onClose: () => void, onSendMessage: (sessionId: string, text: string) => void }) => {
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    if (!currentUser) return null;

    const otherUserId = currentUser.id === session.participants.applicantId ? session.participants.employerId : session.participants.applicantId;
    const otherUser = users.find(u => u.id === otherUserId);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(session.sessionId, message);
            setMessage('');
        }
    };
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [session.messages]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-[95%] max-w-lg h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h2 className="font-bold text-gray-800">Chat với {otherUser?.name || 'Không rõ'}</h2>
                    <p className="text-sm text-gray-500">Về tin tuyển dụng: {job?.title || 'Không rõ'}</p>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
                    {session.messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                            <p className={`max-w-[80%] p-2 rounded-lg text-sm shadow-sm whitespace-pre-wrap break-words ${msg.senderId === currentUser.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>{msg.text}</p>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-2 border-t flex items-center">
                    <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Nhập tin nhắn..." className="flex-1 border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={handleSend} className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600">Gửi</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App = () => {
    // --- STATE MANAGEMENT ---
    const [jobs, setJobs] = useState<Job[]>(initialJobs);
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [payments, setPayments] = useState<Payment[]>(initialPayments);
    const [reports, setReports] = useState<Report[]>([]);
    const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
    const [privateChats, setPrivateChats] = useState<PrivateChatSession[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);


    const [view, setView] = useState<AppView>('main');
    const [currentUser, setCurrentUser] = useState<CurrentUser>(null);

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
    const [jobToReport, setJobToReport] = useState<Job | null>(null);
    const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
    const [jobDataForPayment, setJobDataForPayment] = useState<any>(null);
    const [activePrivateChat, setActivePrivateChat] = useState<string | null>(null);

    const [filters, setFilters] = useState({ keyword: '', industry: '', salary: '' });
    const [showOnlySaved, setShowOnlySaved] = useState(false);
    const [savedJobIds, setSavedJobIds] = useState<Set<number>>(new Set());

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [isAiReady, setIsAiReady] = useState(false);
    const ai = useRef<GoogleGenAI | null>(null);

    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [newJobNotifications, setNewJobNotifications] = useState<Job[]>([]);
    const notificationRef = useRef<HTMLDivElement>(null);

    const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

    const [isIpTrusted, setIsIpTrusted] = useState(process.env.NODE_ENV === 'development'); // Dev default for easier testing

    // --- TOAST NOTIFICATION ---
    const showToast = useCallback((message: string) => {
        setToast({ message, id: Date.now() });
        setTimeout(() => setToast(null), 3000);
    }, []);
    
    // --- ADMIN ACTION LOGGING ---
    const logAdminAction = useCallback((action: string) => {
        if (!currentUser || currentUser.role !== 'admin') return;
        const newLog: ActionLog = {
            id: Date.now(),
            adminId: currentUser.id,
            adminName: currentUser.name,
            action: action,
            ipAddress: '127.0.0.1', // Simulated IP
            timestamp: new Date().toLocaleString('vi-VN')
        };
        setActionLogs(prev => [newLog, ...prev]);
    }, [currentUser]);

    // --- EFFECTS ---
    // Session Persistence Effect
    useEffect(() => {
        try {
            const savedSession = localStorage.getItem('workhub-session');
            if (savedSession) {
                const user: CurrentUser = JSON.parse(savedSession);
                 // A quick check to ensure the user from storage is valid
                const userExistsInDb = initialUsers.some(dbUser => dbUser.id === user?.id);
                if (user && userExistsInDb) {
                    setCurrentUser(user);
                } else {
                     localStorage.removeItem('workhub-session');
                }
            }
        } catch (error) {
            console.error("Failed to parse user session from localStorage", error);
            localStorage.removeItem('workhub-session');
        }
    }, []);

    useEffect(() => {
        if (CONFIG.GOOGLE_API_KEY) {
            try {
                ai.current = new GoogleGenAI({ apiKey: CONFIG.GOOGLE_API_KEY });
                setIsAiReady(true);
                setChatMessages([{ sender: 'bot', text: 'Chào bạn! Tôi là trợ lý AI của WorkHub. Tôi có thể giúp gì cho bạn hôm nay?' }]);
            } catch (error) {
                console.error("Failed to initialize Google AI:", error);
                setIsAiReady(false);
            }
        } else {
            console.warn("Google API Key is missing.");
        }
    }, []);

    // FIX FOR VERCEL DEPLOYMENT & DARK MODE: Prevents "document is not defined" error during build
    // and fixes input field visibility on mobile dark mode.
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
          .prose {
            max-width: 100% !important;
          }
          /* Dark Mode Input Field Fix for Mobile OS Override */
          @media (prefers-color-scheme: dark) {
            input[type="text"],
            input[type="email"],
            input[type="tel"],
            input[type="password"],
            textarea,
            select {
              background-color: #1a1a1a !important;
              color: #ffffff !important;
              -webkit-appearance: none !important;
              -webkit-text-fill-color: #ffffff !important;
              border: 1px solid #444444 !important;
            }
          }
        `;
        document.head.appendChild(style);
        return () => {
          document.head.removeChild(style);
        };
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            if (window.location.hash === '#secure-panel-49cax' && isIpTrusted) {
                setView('adminLogin');
            } else if (window.location.hash === '#secure-panel-49cax' && !isIpTrusted) {
                setView('forbidden');
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [isIpTrusted]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- DATA & FILTERS ---
    const uniqueIndustries = useMemo(() => [...new Set(initialJobs.map(j => j.industry))], []);

    const filteredJobs = useMemo(() => {
        let jobsToFilter = showOnlySaved ? jobs.filter(j => savedJobIds.has(j.id)) : jobs;
        
        return jobsToFilter.filter(job => {
            const keyword = filters.keyword.toLowerCase();
            const keywordMatch = keyword === '' ||
                job.title.toLowerCase().includes(keyword) ||
                job.company.toLowerCase().includes(keyword) ||
                job.location.toLowerCase().includes(keyword);
            
            const industryMatch = filters.industry === '' || job.industry === filters.industry;
            
            const salaryMatch = filters.salary === '' || (
                filters.salary === '0-5' && parseInt(job.salary) <= 5
            ) || (
                filters.salary === '5-10' && parseInt(job.salary) > 5 && parseInt(job.salary) <= 10
            ) || (
                filters.salary === '10-15' && parseInt(job.salary) > 10 && parseInt(job.salary) <= 15
            );

            return keywordMatch && industryMatch && salaryMatch;
        }).sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }, [jobs, filters, showOnlySaved, savedJobIds]);
    
    const searchJobs = (keywords: string): Job[] => {
        if (!keywords) return [];
        const searchTerms = keywords.toLowerCase().split(' ');
        return jobs
            .filter(job => {
                const jobText = `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
                return searchTerms.every(term => jobText.includes(term));
            })
            .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)) // Prioritize featured jobs
            .slice(0, 3);
    };

    // --- HANDLERS ---
    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const toggleSaveJob = useCallback((jobId: number) => {
        setSavedJobIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
                showToast("Đã bỏ lưu công việc.");
            } else {
                newSet.add(jobId);
                showToast("Đã lưu công việc thành công!");
            }
            return newSet;
        });
    }, [showToast]);

    const handleLogin = useCallback((email: string, pass: string): boolean => {
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user && (user.passwordHash === 'hashed_password_123' || user.passwordHash === 'admin_pass')) {
             if (user.isLocked) {
                showToast("Tài khoản của bạn đã bị khóa.");
                return false;
            }
            const userToStore = { ...user };
            delete (userToStore as any).passwordHash;
            setCurrentUser(userToStore);
            localStorage.setItem('workhub-session', JSON.stringify(userToStore));
            setView(user.role === 'admin' ? 'adminDashboard' : 'main');
            showToast(`Chào mừng ${user.name}!`);
            return true;
        }
        showToast("Email hoặc mật khẩu không chính xác.");
        return false;
    }, [users, showToast]);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        localStorage.removeItem('workhub-session');
        setView('main');
        showToast("Bạn đã đăng xuất.");
    }, [showToast]);

    const handleSignup = useCallback((data: any): boolean => {
        if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
            showToast("Email này đã được đăng ký.");
            return false;
        }
        const newUser: User = {
            id: Date.now(),
            email: data.email,
            passwordHash: 'hashed_password_123',
            name: data.name,
            phone: data.phone,
            role: data.role,
            isLocked: false,
        };
        setUsers(prev => [...prev, newUser]);
        showToast("Đăng ký thành công! Vui lòng đăng nhập.");
        setView('login');
        return true;
    }, [users, showToast]);
    
    const handlePostJob = (jobData: any, isFeatured: boolean) => {
        if (!currentUser) return;

        const newJob: Job = {
            ...jobData,
            id: Date.now(),
            companyId: currentUser.id,
            rating: 0,
            reviewCount: 0,
            reviews: [],
            postedDate: "Vừa xong",
            isFeatured: false, // Will be set after payment if applicable
        };

        if (isFeatured) {
            setJobDataForPayment({ ...newJob, isFeatured: true });
        } else {
            setJobs(prev => [newJob, ...prev]);
            setNewJobNotifications(prev => [newJob, ...prev].slice(0, 5));
            setIsPostingModalOpen(false);
            showToast("Đăng tin thành công!");
        }
    };
    
    const handlePaymentSuccess = () => {
        setJobs(prev => [jobDataForPayment, ...prev]);
        setPayments(prev => [...prev, {
            id: `TXN${Date.now()}`,
            userId: currentUser!.id,
            date: new Date().toISOString().split('T')[0],
            service: 'Tin Nổi Bật',
            amount: 99000,
            status: 'Completed',
        }]);
        setNewJobNotifications(prev => [jobDataForPayment, ...prev].slice(0, 5));
        setJobDataForPayment(null);
        setIsPostingModalOpen(false);
        showToast("Thanh toán và đăng tin nổi bật thành công!");
    };

    const handleAddNewReview = useCallback((jobId: number, review: Omit<Review, 'status'>) => {
        setJobs(prevJobs => prevJobs.map(job => {
            if (job.id === jobId) {
                return { ...job, reviews: [{...review, status: 'pending'}, ...job.reviews] };
            }
            return job;
        }));
        showToast("Cảm ơn bạn đã gửi đánh giá! Đánh giá của bạn đang chờ duyệt.");
    }, [showToast]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || !ai.current) return;
        const newUserMessage: ChatMessage = { sender: 'user', text: userInput };
        setChatMessages(prev => [...prev, newUserMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsBotTyping(true);

        try {
            // Step 1: Intent Analysis
            const intentPrompt = `System: You are an intent classification AI for a job board chatbot. Analyze the user's message and determine if they are searching for a job or just having a general conversation. If they are searching for a job, identify the keywords (job title, location, skills). Respond ONLY with a JSON object in the format: For job search: { "intent": "JOB_SEARCH", "keywords": "extracted keywords" } For anything else: { "intent": "GENERAL_CONVERSATION" }\n\nUser message: "${currentInput}"`;
            
            const intentResponse = await ai.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: intentPrompt,
                config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { intent: { type: Type.STRING }, keywords: { type: Type.STRING }}}}
            });

            const intentData = JSON.parse(intentResponse.text.trim());

            if (intentData.intent === 'JOB_SEARCH' && intentData.keywords) {
                // Step 2: Perform search and respond with rich cards
                const foundJobs = searchJobs(intentData.keywords);
                if (foundJobs.length > 0) {
                    const botMessage: ChatMessage = { sender: 'bot', text: `Tôi đã tìm thấy ${foundJobs.length} công việc phù hợp với tìm kiếm của bạn:`, jobs: foundJobs };
                    setChatMessages(prev => [...prev, botMessage]);
                } else {
                    const botMessage: ChatMessage = { sender: 'bot', text: `Rất tiếc, tôi không tìm thấy công việc nào cho "${intentData.keywords}". Bạn có thể thử với từ khóa khác không?` };
                    setChatMessages(prev => [...prev, botMessage]);
                }
            } else {
                // Step 3: General conversation
                const chatPrompt = `User question: "${currentInput}"\nAnswer in Vietnamese.`;
                 const response = await ai.current.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: chatPrompt,
                });
                const botMessage: ChatMessage = { sender: 'bot', text: response.text };
                setChatMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("Gemini API error:", error);
            const errorMessage: ChatMessage = { sender: 'bot', text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.' };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotTyping(false);
        }
    };
    
    const handleOpenNotificationJob = (job: Job) => {
        setSelectedJob(job);
        setIsNotificationOpen(false);
    };

    const handleOpenJobFromChat = (job: Job) => {
        setSelectedJob(job);
        setIsChatOpen(false);
    };
    
    // --- CHAT & ADMIN HANDLERS ---
    const handleStartPrivateChat = (job: Job) => {
        if (!currentUser) {
            showToast("Vui lòng đăng nhập để chat với nhà tuyển dụng.");
            setView('login');
            setSelectedJob(null);
            return;
        }
        if (currentUser.role !== 'jobseeker') {
            showToast("Chức năng này chỉ dành cho người tìm việc.");
            return;
        }

        const sessionId = `${job.id}-${currentUser.id}`;
        const existingChat = privateChats.find(c => c.sessionId === sessionId);

        if (!existingChat) {
            const newChat: PrivateChatSession = {
                sessionId,
                jobId: job.id,
                participants: { applicantId: currentUser.id, employerId: job.companyId },
                messages: [{ senderId: 0, text: `Cuộc hội thoại về tin đăng "${job.title}" đã bắt đầu.`, timestamp: Date.now() }]
            };
            setPrivateChats(prev => [...prev, newChat]);
        }
        
        setActivePrivateChat(sessionId);
        setSelectedJob(null); // Close job detail modal
    };
    
    const handleSendPrivateMessage = (sessionId: string, text: string) => {
        if (!currentUser) return;
        setPrivateChats(prev => prev.map(chat => {
            if (chat.sessionId === sessionId) {
                const newMessage: PrivateChatMessage = {
                    senderId: currentUser.id,
                    text,
                    timestamp: Date.now()
                };
                return { ...chat, messages: [...chat.messages, newMessage] };
            }
            return chat;
        }));
    };
    
    const toggleUserLock = useCallback((userId: number) => {
        setUsers(prev => prev.map(user => user.id === userId ? { ...user, isLocked: !user.isLocked } : user));
        const user = users.find(u => u.id === userId);
        if (user) {
            logAdminAction(`${user.isLocked ? 'Mở khóa' : 'Khóa'} người dùng ${user.email} (ID: ${userId})`);
            showToast(`Đã ${user.isLocked ? 'mở khóa' : 'khóa'} tài khoản.`);
        }
    }, [users, logAdminAction, showToast]);

    const deleteJob = useCallback((jobId: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn tin đăng này không?")) {
            setJobs(prev => prev.filter(job => job.id !== jobId));
            logAdminAction(`Xóa tin đăng ID: ${jobId}`);
            showToast("Đã xóa tin đăng.");
        }
    }, [logAdminAction, showToast]);
    
    const handleUpdateJob = (updatedJob: Job) => {
        setJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
        logAdminAction(`Cập nhật tin đăng "${updatedJob.title}" (ID: ${updatedJob.id})`);
    };

    const handleReportAction = (reportId: number) => {
        setReports(prev => prev.filter(r => r.id !== reportId));
        logAdminAction(`Xử lý báo cáo ID: ${reportId}`);
        showToast("Đã xử lý báo cáo.");
    };

    const handleReviewStatusChange = (jobId: number, reviewIndex: number, newStatus: Review['status']) => {
        setJobs(prev => prev.map(job => {
            if (job.id === jobId) {
                const newReviews = [...job.reviews];
                newReviews[reviewIndex].status = newStatus;
                return { ...job, reviews: newReviews };
            }
            return job;
        }));
        logAdminAction(`Thay đổi trạng thái đánh giá (Job ID: ${jobId}, Review Index: ${reviewIndex}) thành ${newStatus}`);
    };
    
    const handleSubmitReport = (reason: string, details: string) => {
        if (!jobToReport) return;
        const newReport: Report = {
            id: Date.now(),
            jobId: jobToReport.id,
            jobTitle: jobToReport.title,
            reason,
            details,
            status: 'pending'
        };
        setReports(prev => [newReport, ...prev]);
        showToast("Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét sớm nhất có thể.");
        setJobToReport(null);
    };

     const handleCvSubmit = useCallback((job: Job, file: File) => {
        if (!currentUser || currentUser.role !== 'jobseeker') {
            showToast("Vui lòng đăng nhập với tư cách người tìm việc để nộp CV.");
            return;
        }

        // Simulate file upload to Supabase Storage
        setTimeout(() => {
            const simulatedUrl = `https://supabase.io/storage/v1/workhub-cvs/${currentUser.id}-${job.id}-${file.name}`;
            const newApplication: Application = {
                id: Date.now(),
                jobId: job.id,
                applicantId: currentUser.id,
                cvFileUrl: simulatedUrl,
                submittedAt: new Date().toISOString(),
            };
            setApplications(prev => [...prev, newApplication]);

            // Simulate email notification
            console.log(`--- EMAIL NOTIFICATION SIMULATION ---
            To: ${job.recruiter.email}
            Subject: Ứng tuyển mới cho vị trí: ${job.title}
            Body:
            Chào ${job.recruiter.name},

            Bạn đã nhận được một hồ sơ ứng tuyển mới từ ${currentUser.name} cho vị trí "${job.title}".
            Bạn có thể xem CV tại đường dẫn bảo mật sau:
            ${simulatedUrl}

            Trân trọng,
            Hệ thống WorkHub
            -------------------------------------`);

            showToast("Nộp CV thành công! Nhà tuyển dụng đã được thông báo.");
            setSelectedJob(null); // Close modal on success
        }, 2000);
    }, [currentUser, showToast]);


    // --- RENDER LOGIC ---
    const renderView = () => {
        switch (view) {
            case 'login':
                return <LoginPage handleLogin={handleLogin} showToast={showToast} setView={setView} users={users} />;
            case 'signup':
                return <SignupPage handleSignup={handleSignup} setView={setView} showToast={showToast} />;
            case 'employerDashboard':
                return <EmployerDashboard currentUser={currentUser} jobs={jobs} payments={payments} privateChats={privateChats} users={users} handleEditJob={setJobToEdit} handleDeleteJob={deleteJob} openPrivateChat={setActivePrivateChat}/>;
            case 'adminDashboard':
                return <AdminDashboard currentUser={currentUser} setView={setView} users={users} jobs={jobs} reports={reports} actionLogs={actionLogs} toggleUserLock={toggleUserLock} deleteJob={deleteJob} showToast={showToast} handleOpenEditModal={setJobToEdit} handleReportAction={handleReportAction} handleReviewStatusChange={handleReviewStatusChange} />;
            case 'adminLogin':
                return <LoginPage handleLogin={handleLogin} showToast={showToast} setView={setView} users={users} />; // Simplified, can be a separate component
            case 'forbidden':
                return <ForbiddenPage onSimulateTrustedIp={() => setIsIpTrusted(true)} />;
            case 'main':
            default:
                return <MainContent filters={filters} handleFilterChange={handleFilterChange} uniqueIndustries={uniqueIndustries} showOnlySaved={showOnlySaved} setShowOnlySaved={setShowOnlySaved} filteredJobs={filteredJobs} setSelectedJob={setSelectedJob} savedJobIds={savedJobIds} toggleSaveJob={toggleSaveJob} />;
        }
    };
    
    const activeChatSession = privateChats.find(c => c.sessionId === activePrivateChat);

    return (
        <>
            <Header
                currentUser={currentUser}
                setView={setView}
                handleLogout={handleLogout}
                notificationRef={notificationRef}
                handleToggleNotifications={() => setIsNotificationOpen(!isNotificationOpen)}
                isNotificationOpen={isNotificationOpen}
                newJobNotifications={newJobNotifications}
                handleOpenNotificationJob={handleOpenNotificationJob}
                setIsPostingModalOpen={setIsPostingModalOpen}
            />
            {renderView()}
            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    handleAddNewReview={handleAddNewReview}
                    showToast={showToast}
                    handleStartPrivateChat={handleStartPrivateChat}
                    handleOpenReportModal={setJobToReport}
                    googleApiKey={CONFIG.GOOGLE_API_KEY}
                    currentUser={currentUser}
                    applications={applications}
                    handleCvSubmit={handleCvSubmit}
                />
            )}
            {activeChatSession && currentUser && (
                <PrivateChatModal
                    session={activeChatSession}
                    currentUser={currentUser}
                    users={users}
                    job={jobs.find(j => j.id === activeChatSession.jobId)}
                    onClose={() => setActivePrivateChat(null)}
                    onSendMessage={handleSendPrivateMessage}
                />
            )}
            {jobToEdit && <EditJobModal job={jobToEdit} onClose={() => setJobToEdit(null)} onUpdate={handleUpdateJob} showToast={showToast} />}
            {jobToReport && <ReportJobModal job={jobToReport} onClose={() => setJobToReport(null)} onSubmit={handleSubmitReport} showToast={showToast} />}
            {isPostingModalOpen && currentUser?.role ==='employer' && <JobPostingModal currentUser={currentUser} onClose={() => setIsPostingModalOpen(false)} onPost={handlePostJob} />}
            {jobDataForPayment && <PaymentModal jobData={jobDataForPayment} onClose={() => setJobDataForPayment(null)} onSuccess={handlePaymentSuccess} showToast={showToast} />}
            <ChatWidget 
                isChatOpen={isChatOpen}
                setIsChatOpen={setIsChatOpen}
                chatMessages={chatMessages}
                userInput={userInput}
                setUserInput={setUserInput}
                handleSendMessage={handleSendMessage}
                isBotTyping={isBotTyping}
                isAiReady={isAiReady}
                selectedJob={selectedJob}
                handleOpenJobFromChat={handleOpenJobFromChat}
            />
             {toast && (
                <div className="fixed top-5 right-5 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in-out">
                    {toast.message}
                </div>
            )}
             <style>{`
                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translateY(-20px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
                .animate-fade-in-out {
                    animation: fade-in-out 3s ease-in-out forwards;
                }
            `}</style>
        </>
    );
};

export default App;