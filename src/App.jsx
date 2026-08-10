import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip 
} from 'recharts';
import { 
  Home, Wallet, Target, Calendar as CalendarIcon, 
  Plus, ArrowUp, ArrowDown, Image as ImageIcon, 
  Coffee, Car, ShoppingBag, Gamepad2, Monitor, 
  Briefcase, DollarSign, ChevronLeft, ChevronRight,
  ShieldCheck, Lock, Trash2, X, ChevronDown, ChevronUp, Landmark
} from 'lucide-react';

// --- Constants & Config ---
const COLORS = ['#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#FBBF24', '#2DD4BF'];

const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'อาหาร', icon: Coffee, color: '#60A5FA' },
  { id: 'gas', label: 'น้ำมัน', icon: Car, color: '#F472B6' },
  { id: 'snacks', label: 'ขนม', icon: ShoppingBag, color: '#FBBF24' },
  { id: 'house', label: 'ของใช้', icon: Home, color: '#34D399' },
  { id: 'game', label: 'เติมเกม', icon: Gamepad2, color: '#A78BFA' },
  { id: 'pc', label: 'อุปกรณ์คอม', icon: Monitor, color: '#2DD4BF' },
];

const INCOME_CATEGORIES = [
  { id: 'salary', label: 'งานประจำ', icon: Briefcase, color: '#60A5FA' },
  { id: 'freelance', label: 'ฟรีแลนซ์', icon: Monitor, color: '#A78BFA' },
  { id: 'other', label: 'อื่นๆ', icon: DollarSign, color: '#34D399' },
];

// ข้อมูลกระเป๋าเงิน (Account Switcher)
const DEFAULT_WALLETS = [
  { id: 'cash', label: 'เงินสด', icon: Wallet, theme: 'from-blue-400 to-teal-400', glow: 'bg-blue-500/20' },
  { id: 'bank1', label: 'ธนาคาร 1', icon: Landmark, theme: 'from-emerald-400 to-green-500', glow: 'bg-emerald-500/20' },
  { id: 'bank2', label: 'ธนาคาร 2', icon: Landmark, theme: 'from-fuchsia-400 to-purple-500', glow: 'bg-fuchsia-500/20' },
  { id: 'bank3', label: 'ธนาคาร 3', icon: Landmark, theme: 'from-cyan-400 to-sky-500', glow: 'bg-cyan-500/20' }
];

// --- Helper Functions ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const formatMoney = (amount) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
const formatCompactMoney = (amount) => {
  if (amount >= 1000) return `฿${(amount / 1000).toFixed(1)}k`;
  return `฿${amount}`;
};

export default function App() {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState('home'); // home, expense, income, fixed, wishlist
  const [dashboardMode, setDashboardMode] = useState('balance'); // balance, expense
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // ควบคุม Dropdown ปฏิทิน
  
  // ระบบ Account Switcher (สลับกระเป๋า)
  const [activeWallet, setActiveWallet] = useState('cash');

  // Data States
  const [transactions, setTransactions] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [wishlists, setWishlists] = useState([]);

  // Form States
  const [amountInput, setAmountInput] = useState('');
  const [detailInput, setDetailInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Fixed Expense Form States
  const [fixedNameInput, setFixedNameInput] = useState('');
  const [fixedAmountInput, setFixedAmountInput] = useState('');
  
  // Load initial data
  useEffect(() => {
    const savedTx = localStorage.getItem('nj_transactions');
    const savedFixed = localStorage.getItem('nj_fixed');
    const savedWish = localStorage.getItem('nj_wishlists');
    
    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedFixed) setFixedExpenses(JSON.parse(savedFixed));
    if (savedWish) setWishlists(JSON.parse(savedWish));
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem('nj_transactions', JSON.stringify(transactions));
    localStorage.setItem('nj_fixed', JSON.stringify(fixedExpenses));
    localStorage.setItem('nj_wishlists', JSON.stringify(wishlists));
  }, [transactions, fixedExpenses, wishlists]);

  // --- Calculations (กรองตามกระเป๋าที่เลือก) ---
  const calculations = useMemo(() => {
    // ฟังก์ชันกรองข้อมูลเฉพาะของกระเป๋าที่เลือก
    const isCurrentWallet = (item) => item.walletId === activeWallet || (!item.walletId && activeWallet === 'cash');

    const currentTx = transactions.filter(isCurrentWallet);
    const currentFixed = fixedExpenses.filter(isCurrentWallet);
    const currentWish = wishlists.filter(isCurrentWallet);

    const totalIncome = currentTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalDailyExpense = currentTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const activeFixed = currentFixed.filter(f => f.isActive).reduce((sum, f) => sum + f.amount, 0);
    const totalWishlist = currentWish.reduce((sum, w) => sum + w.amount, 0);
    
    // **แก้ไข:** ไม่นำ activeFixed มาหักลบออกจาก safeToSpend ตามคำขอ
    const safeToSpend = totalIncome - totalWishlist; 
    const remaining = safeToSpend - totalDailyExpense;

    // For Donut Chart
    const expenseByCategory = EXPENSE_CATEGORIES.map(cat => ({
      name: cat.label,
      value: currentTx.filter(t => t.type === 'expense' && t.category === cat.id).reduce((sum, t) => sum + t.amount, 0),
      color: cat.color
    })).filter(cat => cat.value > 0);

    return { totalIncome, totalDailyExpense, activeFixed, totalWishlist, safeToSpend, remaining, expenseByCategory, currentTx };
  }, [transactions, fixedExpenses, wishlists, activeWallet]);

  // --- Handlers ---
  const handleAddTransaction = (type) => {
    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) return alert('กรุณาระบุจำนวนเงิน');
    if (!selectedCategory) return alert('กรุณาเลือกหมวดหมู่');

    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const catData = categories.find(c => c.id === selectedCategory);
    
    // ถ้ารายละเอียดว่างเปล่า ให้ใช้ชื่อหมวดหมู่แทน
    const finalDetail = detailInput.trim() !== '' ? detailInput : catData.label;

    const newTx = {
      id: generateId(),
      type,
      amount,
      category: selectedCategory,
      detail: finalDetail,
      date: selectedDate.toISOString().split('T')[0],
      walletId: activeWallet // บันทึกกระเป๋า
    };

    setTransactions([...transactions, newTx]);
    setAmountInput('');
    setDetailInput('');
    setSelectedCategory(null);
  };

  const handleRingClick = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setTimeout(() => {
      setDashboardMode(prev => prev === 'balance' ? 'expense' : 'balance');
    }, 250); // เปลี่ยน content ตอนหมุนไปครึ่งทาง
    setTimeout(() => {
      setIsSpinning(false);
    }, 500); // ระยะเวลา animation
  };

  // --- UI Components ---
  const renderCalendar = (type) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const changeMonth = (offset) => {
      setCurrentDate(new Date(year, month + offset, 1));
    };

    return (
      <div className="bg-[#0b1b36]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl w-full mb-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white"><ChevronLeft size={20} /></button>
          <h3 className="text-lg font-medium text-white">
            {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => changeMonth(1)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white"><ChevronRight size={20} /></button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-blue-200/60 mb-2">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d}>{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-12" />;
            
            const dateStr = day.toISOString().split('T')[0];
            const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            
            // Calculate daily total for the current view AND current wallet
            const dailyTotal = calculations.currentTx
              .filter(t => t.type === type && t.date === dateStr)
              .reduce((sum, t) => sum + t.amount, 0);

            return (
              <button
                key={dateStr}
                onClick={() => {
                  setSelectedDate(day);
                  setIsCalendarOpen(false); // ปิดปฏิทินหลังจากเลือกวันที่
                }}
                className={`h-12 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  isSelected ? 'bg-blue-500/40 border border-blue-400/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                  : isToday ? 'bg-white/10 text-white font-bold' 
                  : 'text-blue-100 hover:bg-white/5'
                }`}
              >
                <span>{day.getDate()}</span>
                {dailyTotal > 0 && (
                  <span className={`text-[9px] mt-0.5 ${type === 'expense' ? 'text-pink-300' : 'text-emerald-300'}`}>
                    {formatCompactMoney(dailyTotal)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTransactionForm = (type) => {
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const todaysTx = calculations.currentTx.filter(t => t.type === type && t.date === dateStr);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full flex flex-col items-center">
        
        {/* Dropdown Toggle สำหรับปฏิทิน */}
        <button 
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="w-full bg-[#0b1b36]/60 backdrop-blur-xl border border-white/10 rounded-[20px] p-4 mb-4 flex justify-between items-center shadow-lg transition-all active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === 'expense' ? 'bg-pink-500/20 text-pink-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              <CalendarIcon size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs text-blue-200/60 mb-0.5">เลือกวันที่</p>
              <p className="text-white font-medium text-sm">
                {selectedDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="text-blue-200/50">
            {isCalendarOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {/* ส่วนปฏิทิน (พับเก็บได้) */}
        <div className={`w-full overflow-hidden transition-all duration-300 ${isCalendarOpen ? 'max-h-[500px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
           {renderCalendar(type)}
        </div>

        {/* ฟอร์มบันทึก */}
        <div className="bg-[#0b1b36]/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-5 shadow-2xl w-full">
          <h3 className="text-white font-medium mb-4 flex items-center justify-between">
            <span>บันทึก {type === 'expense' ? 'รายจ่าย' : 'รายรับ'}</span>
          </h3>
          
          <div className="flex bg-black/20 rounded-[20px] p-1 mb-4 border border-white/5 shadow-inner">
            <span className="pl-4 py-3 text-blue-200 font-medium">฿</span>
            <input
              type="number"
              placeholder="0.00"
              className="bg-transparent w-full p-3 text-white font-bold text-lg outline-none"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>

          {/* Categories Selector */}
          <div className="flex overflow-x-auto gap-3 pb-2 mb-4 scrollbar-hide snap-x snap-mandatory">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center min-w-[76px] h-[100px] p-3 rounded-[32px] transition-all border snap-center ${
                    isSelected 
                      ? 'bg-white/20 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105' 
                      : 'bg-black/20 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="p-2 rounded-full mb-1" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                    <Icon size={20} />
                  </div>
                  <span className="text-xs text-blue-100">{cat.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="รายละเอียด (ไม่ใส่ก็ได้)"
              className="bg-black/20 text-white placeholder-blue-300/50 w-full p-4 rounded-[20px] outline-none focus:bg-black/40 text-sm border border-transparent focus:border-white/10 shadow-inner"
              value={detailInput}
              onChange={(e) => setDetailInput(e.target.value)}
            />
          </div>

          {/* ปุ่มบันทึกดีไซน์ Teal Border */}
          <button 
            onClick={() => handleAddTransaction(type)}
            className="w-full bg-gradient-to-r from-blue-500/20 to-teal-400/20 hover:from-blue-500/40 hover:to-teal-400/40 text-teal-300 font-bold py-4 rounded-[20px] transition-all border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.2)] mt-2"
          >
            บันทึกรายการ
          </button>
        </div>

        {/* Daily List */}
        {todaysTx.length > 0 && (
          <div className="mt-6 space-y-3 w-full">
            <h4 className="text-sm font-medium text-blue-200 px-2">รายการวันนี้</h4>
            {todaysTx.map(tx => {
              const catData = categories.find(c => c.id === tx.category);
              const Icon = catData?.icon || DollarSign;
              return (
                <div key={tx.id} className="flex items-center justify-between bg-[#0b1b36]/30 backdrop-blur-md border border-white/5 p-4 rounded-[24px]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${catData?.color}20`, color: catData?.color }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-white text-sm">{tx.detail}</p>
                      <p className="text-xs text-blue-300/60">{catData?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${type === 'expense' ? 'text-pink-400' : 'text-emerald-400'}`}>
                      {type === 'expense' ? '-' : '+'}{formatMoney(tx.amount)}
                    </span>
                    <button onClick={() => setTransactions(transactions.filter(t => t.id !== tx.id))} className="text-red-400/60 hover:text-red-400 p-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWishlist = () => {
    // ธีมสีสำหรับการ์ดแต่ละใบ
    const colorThemes = {
      blue: 'from-[#3b82f6]/40 to-[#1e3a8a]/60 shadow-[inset_0_2px_10px_rgba(59,130,246,0.5)] border-blue-500/30',
      pink: 'from-[#ec4899]/40 to-[#831843]/60 shadow-[inset_0_2px_10px_rgba(236,72,153,0.5)] border-pink-500/30',
      emerald: 'from-[#10b981]/40 to-[#064e3b]/60 shadow-[inset_0_2px_10px_rgba(16,185,129,0.5)] border-emerald-500/30',
      purple: 'from-[#a855f7]/40 to-[#581c87]/60 shadow-[inset_0_2px_10px_rgba(168,85,247,0.5)] border-purple-500/30',
      amber: 'from-[#f59e0b]/40 to-[#78350f]/60 shadow-[inset_0_2px_10px_rgba(245,158,11,0.5)] border-amber-500/30',
      dark: 'bg-[#0f172a]/80 shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border-white/10'
    };

    const currentWishlists = calculations.currentTx.length >= 0 ? wishlists.filter(w => w.walletId === activeWallet || (!w.walletId && activeWallet === 'cash')) : [];

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col items-center w-full">
        <h2 className="text-xl font-bold text-white mb-6 text-center w-full drop-shadow-md">เป้าหมาย & ของที่อยากได้ 🎁</h2>
        
        {/* Grid ของเป้าหมาย */}
        <div className="grid grid-cols-2 gap-4 mb-8 w-full">
          {currentWishlists.map((item, idx) => {
            const currentTheme = colorThemes[item.color || 'dark'];
            
            return (
              <div key={item.id} className={`relative aspect-[3/4] rounded-[32px] backdrop-blur-xl border shadow-2xl p-4 flex flex-col items-center justify-between group overflow-hidden transition-all duration-300 bg-gradient-to-br min-w-0 ${currentTheme}`}>
                {/* Highlight แสงตกกระทบ */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-60 rounded-[32px] pointer-events-none"></div>
                
                {/* Header: ตัวเลข # และปุ่มลบ */}
                <div className="flex justify-between items-center w-full relative z-10">
                  <div className="bg-black/30 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20 shadow-sm flex items-center justify-center">
                    <span className="text-xl font-black text-white leading-none">#{idx + 1}</span>
                  </div>
                  <button onClick={() => setWishlists(wishlists.filter(w => w.id !== item.id))} className="text-red-400/80 hover:text-red-400 p-2 bg-black/30 rounded-full backdrop-blur-sm border border-white/5">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* รูปภาพ (ขนาดใหญ่) */}
                <div className="relative w-24 h-24 mt-2 rounded-[24px] overflow-hidden bg-black/40 border-2 border-white/20 flex items-center justify-center flex-shrink-0 z-10 shadow-inner">
                  {item.image ? (
                    <img src={item.image} alt="wish" className="w-full h-full object-cover" />
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      <ImageIcon size={28} className="mb-1" />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setWishlists(wishlists.map(w => w.id === item.id ? { ...w, image: reader.result } : w));
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  )}
                </div>

                {/* ข้อมูลด้านล่าง */}
                <div className="relative z-10 w-full text-center flex flex-col justify-end mt-2 min-w-0">
                  <h3 className="font-bold text-sm text-white truncate w-full mb-1 drop-shadow-md px-1">{item.name}</h3>
                  <p className="text-sm text-blue-100 font-bold mb-3 drop-shadow-md bg-black/30 mx-auto px-3 py-1 rounded-full border border-white/10 truncate max-w-full">
                    {formatCompactMoney(item.amount)}
                  </p>

                  {/* Color Picker สำหรับการ์ด */}
                  <div className="flex justify-center gap-2 mb-1">
                    {Object.keys(colorThemes).map(colorKey => (
                      <button 
                        key={colorKey}
                        onClick={() => setWishlists(wishlists.map(w => w.id === item.id ? { ...w, color: colorKey } : w))}
                        className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${item.color === colorKey ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        style={{ 
                          backgroundColor: colorKey === 'blue' ? '#3b82f6' : colorKey === 'pink' ? '#ec4899' : colorKey === 'emerald' ? '#10b981' : colorKey === 'purple' ? '#a855f7' : colorKey === 'amber' ? '#f59e0b' : '#334155'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ฟอร์มเพิ่มเป้าหมาย */}
        <div className="bg-[#0b1b36]/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-white font-medium mb-4">เพิ่มเป้าหมายใหม่</h3>
          <div className="space-y-3">
            <input type="text" id="wishlistName" placeholder="ชื่อเป้าหมาย" className="bg-black/20 text-white placeholder-blue-300/50 w-full p-4 rounded-[20px] outline-none focus:bg-black/40 text-sm border border-transparent focus:border-white/10 shadow-inner" />
            <input type="number" id="wishlistAmount" placeholder="จำนวนเงินที่ต้องใช้" className="bg-black/20 text-white placeholder-blue-300/50 w-full p-4 rounded-[20px] outline-none focus:bg-black/40 text-sm border border-transparent focus:border-white/10 shadow-inner" />
            <button 
              onClick={() => {
                const name = document.getElementById('wishlistName').value;
                const amount = parseFloat(document.getElementById('wishlistAmount').value);
                if (name && amount) {
                  setWishlists([...wishlists, { id: generateId(), name, amount, image: null, color: 'dark', walletId: activeWallet }]);
                  document.getElementById('wishlistName').value = '';
                  document.getElementById('wishlistAmount').value = '';
                }
              }}
              className="w-full bg-gradient-to-r from-blue-500/20 to-teal-400/20 hover:from-blue-500/40 hover:to-teal-400/40 text-teal-300 font-bold py-4 rounded-[20px] transition-all border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.2)] mt-2"
            >
              เพิ่มเข้ากระปุก
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="animate-in fade-in duration-300 flex flex-col items-center w-full">
      
      {/* Title */}
      <h1 className="text-3xl font-black text-white tracking-widest mb-6 drop-shadow-md">NJ Money</h1>

      {/* วงแหวนตรงกลาง (Center Ring) - กลับมาเป็น Solid Ring แบบในภาพ */}
      <div className="relative w-64 h-64 mb-6 flex-shrink-0 cursor-pointer group" onClick={handleRingClick}>
        <div className={`w-full h-full absolute inset-0 transition-transform duration-500 ease-in-out ${isSpinning ? 'scale-75 rotate-180 opacity-50' : 'scale-100 rotate-0 opacity-100'}`}>
          {dashboardMode === 'balance' ? (
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
              {/* Background Circle */}
              <circle cx="50" cy="50" r="45" fill="#0f172a" stroke="#1e3a8a" strokeWidth="4" opacity="0.9" />
              {/* Solid Progress Line */}
              <circle cx="50" cy="50" r="45" fill="none" stroke="#60A5FA" strokeWidth="10" strokeDasharray="141 141" strokeDashoffset="50" strokeLinecap="round" opacity="0.9" />
            </svg>
          ) : (
            <div className="w-full h-full relative bg-[#0f172a] rounded-full shadow-[0_0_25px_rgba(59,130,246,0.5)] border-4 border-[#1e3a8a]">
               {calculations.expenseByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={calculations.expenseByCategory} cx="50%" cy="50%" innerRadius={75} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                        {calculations.expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="8" strokeDasharray="5 5" opacity="0.5" />
                  </svg>
                )}
            </div>
          )}
        </div>

        {/* Text Inside Ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 drop-shadow-md">
          {dashboardMode === 'balance' ? (
             <>
               <span className="text-white text-lg mb-1 font-medium tracking-wide">จำนวนคงเหลือ</span>
               <span className="text-white font-black text-4xl">{formatCompactMoney(calculations.remaining)}</span>
             </>
          ) : (
             <>
               <span className="text-white text-lg mb-1 font-medium tracking-wide">รายจ่าย</span>
               <span className="text-white font-black text-4xl">{formatCompactMoney(calculations.totalDailyExpense)}</span>
             </>
          )}
        </div>
      </div>

      {/* เมนู 4 กล่อง (Monochromatic Blue) */}
      <div className="w-full mt-2">
        <h3 className="text-blue-200 text-sm font-medium mb-3 px-2">จัดการเมนู</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'expense', icon: Wallet, label: 'รายจ่าย', desc: 'ใช้จ่ายรายวัน', bgStyle: 'bg-[#182952]/90 border-white/5' },
            { id: 'income', icon: DollarSign, label: 'รายรับ', desc: 'บันทึกรายได้', bgStyle: 'bg-[#1e3a8a]/80 border-white/10' },
            { id: 'fixed', icon: Lock, label: 'คงที่', desc: 'ค่าหอ, หนี้สิน', bgStyle: 'bg-[#2563eb]/70 border-white/20' },
            { id: 'wishlist', icon: Target, label: 'เป้าหมาย', desc: 'ของที่อยากได้', bgStyle: 'bg-[#3b82f6]/60 border-white/30' }
          ].map(menu => (
            <button
              key={menu.id}
              onClick={() => setActiveTab(menu.id)}
              className={`
                relative overflow-hidden rounded-[32px] p-5 aspect-square flex flex-col justify-between items-start text-left group transition-all duration-300 hover:scale-105 active:scale-95 ${menu.bgStyle} backdrop-blur-xl border shadow-[inset_0_2px_15px_rgba(255,255,255,0.1),_0_10px_20px_rgba(15,23,42,0.5)]
              `}
            >
              {/* Highlight Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-[32px] pointer-events-none"></div>
              
              <div className="w-12 h-12 rounded-[18px] flex items-center justify-center relative z-10 bg-white/10 border border-white/10">
                <menu.icon size={24} className="text-white drop-shadow-md" />
              </div>
              <div className="relative z-10 w-full mt-2">
                <h3 className="font-bold text-lg mb-1 text-white drop-shadow-sm">{menu.label}</h3>
                <p className="text-[10px] leading-tight opacity-80 text-white/90">{menu.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const currentWalletData = DEFAULT_WALLETS.find(w => w.id === activeWallet) || DEFAULT_WALLETS[0];

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex justify-center relative overflow-hidden">
      {/* Dynamic Backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0b1b36] to-[#020617] -z-20"></div>
      <div className={`absolute top-0 left-0 w-full h-96 ${currentWalletData.glow} blur-[100px] -z-10 rounded-b-full transition-colors duration-1000 ease-in-out`}></div>
      <div className={`absolute bottom-0 right-0 w-96 h-96 ${currentWalletData.glow} blur-[100px] -z-10 rounded-tl-full transition-colors duration-1000 ease-in-out`}></div>

      {/* Main Container - iPhone 13 width */}
      <div className="w-full max-w-[390px] mx-auto bg-transparent h-screen flex flex-col relative z-0 shadow-2xl">
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-28 pt-6 px-5 scrollbar-hide">
          
          {/* Account Switcher (Top Header) - รูปแบบ Capsule ใส 4 ปุ่ม */}
          <div className="flex flex-col items-center mb-6 px-1 w-full">
            <div className="grid grid-cols-4 gap-2 w-full">
              {DEFAULT_WALLETS.map(w => (
                <button
                  key={w.id}
                  onClick={() => setActiveWallet(w.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-bold transition-all border ${
                    activeWallet === w.id
                      ? `bg-gradient-to-br ${w.theme} text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] border-white/20 scale-105`
                      : 'bg-black/20 text-blue-200/60 hover:text-white hover:bg-white/10 border-white/5'
                  }`}
                >
                  <w.icon size={18} />
                  <span className="whitespace-nowrap">{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Views */}
          {activeTab === 'home' && renderDashboard()}
          {activeTab === 'expense' && renderTransactionForm('expense')}
          {activeTab === 'income' && renderTransactionForm('income')}
          {activeTab === 'wishlist' && renderWishlist()}
          
          {/* Fixed Expenses Tab */}
          {activeTab === 'fixed' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <h2 className="text-xl font-bold text-white mb-6 text-center">รายจ่ายคงที่ต่อเดือน 🔒</h2>
               <div className="bg-[#0b1b36]/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 mb-6 shadow-2xl">
                 <h3 className="text-white font-medium mb-4">เพิ่มรายจ่ายคงที่</h3>
                 <div className="space-y-3">
                   <input 
                     type="text" 
                     placeholder="ชื่อรายการ (เช่น ค่าหอ)" 
                     className="bg-black/20 text-white placeholder-blue-300/50 w-full p-4 rounded-[20px] outline-none focus:bg-black/40 text-sm border border-transparent focus:border-white/10 shadow-inner" 
                     value={fixedNameInput} 
                     onChange={(e) => setFixedNameInput(e.target.value)} 
                   />
                   <input 
                     type="number" 
                     placeholder="จำนวนเงิน" 
                     className="bg-black/20 text-white placeholder-blue-300/50 w-full p-4 rounded-[20px] outline-none focus:bg-black/40 text-sm border border-transparent focus:border-white/10 shadow-inner" 
                     value={fixedAmountInput} 
                     onChange={(e) => setFixedAmountInput(e.target.value)} 
                   />
                   <button 
                     onClick={() => {
                       if (fixedNameInput && fixedAmountInput) {
                         setFixedExpenses([...fixedExpenses, { id: generateId(), name: fixedNameInput, amount: parseFloat(fixedAmountInput), isActive: true, walletId: activeWallet }]);
                         setFixedNameInput(''); 
                         setFixedAmountInput('');
                       }
                     }}
                     className="w-full bg-gradient-to-r from-blue-500/20 to-teal-400/20 hover:from-blue-500/40 hover:to-teal-400/40 text-teal-300 font-bold py-4 rounded-[20px] transition-all border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.2)] mt-2"
                   >
                     บันทึกรายการ
                   </button>
                 </div>
               </div>
               
               <p className="text-xs text-blue-200/50 text-center mb-4">
                 * รายจ่ายคงที่เปิดไว้เพื่อเตือนความจำ จะไม่ถูกนำไปหักในยอดคงเหลือหน้าแรก
               </p>

               <div className="space-y-3">
                 {fixedExpenses.filter(f => f.walletId === activeWallet || (!f.walletId && activeWallet === 'cash')).map(item => (
                   <div key={item.id} className={`bg-[#0b1b36]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex justify-between items-center transition-all ${!item.isActive ? 'opacity-50 grayscale' : ''}`}>
                     <div>
                       <h4 className="text-white font-medium">{item.name}</h4>
                       <p className="text-blue-200 text-sm">{formatMoney(item.amount)}</p>
                     </div>
                     <div className="flex items-center gap-3">
                       <button onClick={() => setFixedExpenses(fixedExpenses.map(f => f.id === item.id ? { ...f, isActive: !f.isActive } : f))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${item.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white'}`}>
                         {item.isActive ? 'เปิด' : 'ปิด'}
                       </button>
                       <button onClick={() => setFixedExpenses(fixedExpenses.filter(f => f.id !== item.id))} className="text-red-400/60 hover:text-red-400 p-2 bg-black/20 rounded-xl">
                         <Trash2 size={16} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        {/* Bottom Tab Navigation */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-[#0b1b36]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex justify-around items-center shadow-2xl">
            <button onClick={() => setActiveTab('home')} className={`p-3 rounded-2xl transition-all flex items-center justify-center w-14 h-14 ${activeTab === 'home' ? 'bg-white/15 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white' : 'text-blue-300/50 hover:text-white'}`}><Home size={24} /></button>
            <button onClick={() => setActiveTab('expense')} className={`p-3 rounded-2xl transition-all flex items-center justify-center w-14 h-14 ${activeTab === 'expense' ? 'bg-white/15 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white' : 'text-blue-300/50 hover:text-white'}`}><Wallet size={24} /></button>
            <button onClick={() => setActiveTab('income')} className={`p-3 rounded-2xl transition-all flex items-center justify-center w-14 h-14 ${activeTab === 'income' ? 'bg-white/15 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white' : 'text-blue-300/50 hover:text-white'}`}><DollarSign size={24} /></button>
            <button onClick={() => setActiveTab('wishlist')} className={`p-3 rounded-2xl transition-all flex items-center justify-center w-14 h-14 ${activeTab === 'wishlist' ? 'bg-white/15 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white' : 'text-blue-300/50 hover:text-white'}`}><Target size={24} /></button>
          </div>
        </div>
      </div>
      
      {/* ซ่อน Scrollbar ด้วย CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
