# Phoenix Draft System Integration Guide

## 🚀 **When Phoenix Runs**

Phoenix (`mix phx.server`) must be running **whenever drafts are active**. It's now included in your main development launcher.

## 🔄 **Complete Development Environment**

### **Automatic Startup** (Recommended)
```bash
# Starts everything including Phoenix
H:\Project Folder\Predecessor website\launchers\Start_Development_Simple.bat
```

This now starts **4 services**:
1. **NocoDB** (Database UI) - localhost:8080
2. **Backend API** - localhost:3001  
3. **Phoenix Draft System** - localhost:4000 ⭐ **NEW!**
4. **Frontend React** - localhost:3000

### **Manual Startup** (If needed)
```bash
# In separate terminals/command prompts:
cd "H:\Project Folder\Predecessor website\backend"
npm run dev

cd "H:\Project Folder\Predecessor website\phoenix_draft"  
mix phx.server

cd "H:\Project Folder\Predecessor website\frontend"
npm start
```

## 🎯 **System Architecture**

```
User Journey:
┌─────────────────┐    Draft Started    ┌─────────────────┐
│   React App     │ ──────────────────→ │  Phoenix App    │
│  localhost:3000 │                     │  localhost:4000 │
│                 │                     │                 │
│ • Tournaments   │                     │ • Coin Toss     │
│ • Teams         │                     │ • Real-time     │  
│ • Registration  │                     │ • Pick/Ban      │
└─────────────────┘    Results Back     └─────────────────┘
                   ←──────────────────
```

## ⚡ **Key Points**

- **Phoenix MUST run** during any draft activity
- **React creates** the draft sessions  
- **Phoenix handles** the real-time drafting
- **Results flow back** to React for tournament management

## 🧪 **Testing Both Systems**

1. **Start full environment**: `Start_Development_Simple.bat`
2. **Test React**: http://localhost:3000 (tournaments)
3. **Test Phoenix**: http://localhost:4000 (drafts)
4. **Test integration**: Create draft in React → Phoenix handles it

## 🔍 **Troubleshooting**

### **If Phoenix doesn't start:**
- Check Elixir installation: `elixir --version`
- Manually run: `cd phoenix_draft && mix phx.server`

### **If drafts don't work:**
- Ensure Phoenix is running on port 4000
- Check browser console for connection errors
- Verify React can reach `http://localhost:4000/api/auth/token`

## 📊 **Service Health Check**

After startup, verify all services:
- ✅ http://localhost:3000 (React)
- ✅ http://localhost:3001 (Backend API)  
- ✅ http://localhost:4000 (Phoenix Drafts)
- ✅ http://localhost:8080 (NocoDB)

---

**Bottom Line**: Phoenix is now automatically included in your development environment. When you start development, everything needed for drafts runs automatically! 🎊