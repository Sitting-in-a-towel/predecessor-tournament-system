# Predecessor Tournament Management System

A comprehensive web-based tournament management system for Predecessor esports tournaments, featuring real-time draft capabilities, team management, and administrative tools.

## 🚀 Features

- **Tournament Management**: Create and manage single/double elimination, round robin, and Swiss format tournaments
- **Team Registration**: Complete team creation and management workflow
- **Real-time Draft System**: Live pick/ban phases with WebSocket support
- **Discord Integration**: OAuth authentication and user management
- **Admin Dashboard**: Comprehensive statistics and system monitoring
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

### Frontend
- **React 18** with hooks and context
- **React Router** for navigation
- **Axios** for API communication
- **React Toastify** for notifications
- **Socket.io** for real-time features

### Backend
- **Node.js** with Express
- **Passport.js** for Discord OAuth
- **Socket.io** for WebSocket connections
- **Winston** for logging
- **Express-validator** for input validation

### Database
- **Airtable** for data storage
- Session storage (configurable: memory, file, Redis, PostgreSQL)

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher
- **Airtable** account and API key
- **Discord** application for OAuth

## 🚀 Quick Start

### 1. Start Development
```bash
# Use the UI launcher (recommended)
launchers\Start_UI_Launcher_Real.bat

# Or start both services
launchers\Start_Development_Environment.bat
```

### 2. Access the Application
- **Local**: http://localhost:3000
- **Live**: https://ocl-predecessor.netlify.app

## 🌐 URLs

### Local Development
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **UI Launcher**: http://localhost:4000
- **Admin Dashboard**: http://localhost:3000/admin/dashboard

### Production
- **Live Site**: https://ocl-predecessor.netlify.app
- **API**: https://predecessor-tournament-api.onrender.com

## 📚 Documentation

- [Quick Start Guide](documentation/QUICK_START_GUIDE.md)
- [Deployment Guide](documentation/DEPLOYMENT_STEPS.md)
- [File Organization](documentation/FILE_ORGANIZATION.md)
- [Hosting Comparison](documentation/HOSTING_COMPARISON.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
cd backend && npm test

# Frontend tests only
cd frontend && npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Automatic Deployment
```bash
# Any push to main branch automatically deploys to:
# Frontend: https://ocl-predecessor.netlify.app
# Backend: https://predecessor-tournament-api.onrender.com
git push origin main
```

## 📊 Monitoring

- **Logs**: Check `logs/` directory
- **Error Tracking**: Sentry integration
- **Performance**: LogRocket session replay
- **Analytics**: Google Analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AIRTABLE_PERSONAL_TOKEN` | Airtable API token | Yes |
| `AIRTABLE_BASE_ID` | Airtable base ID | Yes |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | Yes |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | Yes |
| `SESSION_SECRET` | Session encryption key | Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Backend server port | No |

## 🔒 Security

- All user inputs are validated and sanitized
- Rate limiting on API endpoints
- Secure session management
- HTTPS in production
- Environment variables for secrets

## 📈 Performance

- React code splitting for optimal loading
- Image optimization
- API response caching
- Database query optimization
- CDN integration in production

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill processes on ports 3000/3001
   npx kill-port 3000 3001
   ```

2. **Airtable connection failed**
   - Check API token permissions
   - Verify base ID is correct
   - Ensure tables exist

3. **Discord OAuth not working**
   - Verify redirect URI matches exactly
   - Check client ID and secret
   - Ensure application is not rate limited

### Getting Help

- Check the documentation files in the `docs/` and `documentation/` folders
- Review logs in `backend/logs/` for error details
- Use the troubleshooting guides provided

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Predecessor game community
- Airtable for database hosting
- Discord for authentication platform
- All contributors and testers

---

## 🚀 Roadmap

- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Tournament streaming integration
- [ ] Multi-language support
- [ ] Plugin system for custom features

---

**Built with ❤️ for the Predecessor community**
