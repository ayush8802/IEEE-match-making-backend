# IEEE Matchmaking Backend

Backend API server for the IEEE Matchmaking Platform, built with Express.js, Socket.io, and Supabase.

## 🚀 Features

- **RESTful API** - Express.js backend with structured routes
- **Real-time Messaging** - Socket.io for instant chat functionality
- **Message Moderation** - Rule-based and AI-based content filtering
- **Email Notifications** - SMTP integration for contact forms and moderation alerts
- **Authentication** - Supabase Auth integration
- **Database** - PostgreSQL via Supabase
- **Error Handling** - Comprehensive error handling middleware
- **Logging** - Structured logging system
- **CORS** - Configurable CORS for frontend integration

## 📋 Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Supabase account and project
- SMTP account (Gmail or other provider) for email features

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IEEE-Metaverse/IEEE-matchmaking-backend.git
   cd IEEE-matchmaking-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   # Required
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Optional (with defaults)
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   
   # Email Configuration (required for email features)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   
   # Moderation (optional)
   MODERATION_EMAIL=ieeemetaverse@gmail.com
   ENABLE_AI_MODERATION=false
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up database**
   
   Run the SQL scripts in order:
   ```sql
   -- 1. Create conversations system
   -- Execute: create_conversations_system.sql
   
   -- 2. Create moderation system
   -- Execute: create_moderation_system.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

## 🚂 Railway Deployment

This backend is configured for deployment on [Railway](https://railway.app).

### Step 1: Connect Repository

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select `IEEE-Metaverse/IEEE-matchmaking-backend`

### Step 2: Configure Service

1. Railway will auto-detect the Node.js project
2. Set the **Root Directory** to `/` (root of the repo)
3. Railway will use `railway.json` for configuration

### Step 3: Set Environment Variables

In Railway dashboard, add these environment variables:

**Required:**
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=production
```

**Frontend URL (for CORS):**
```
FRONTEND_URL=https://your-frontend.up.railway.app
```

**Email Configuration:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**Moderation (Optional):**
```
MODERATION_EMAIL=ieeemetaverse@gmail.com
ENABLE_AI_MODERATION=false
OPENAI_API_KEY=your_openai_api_key
```

**Note:** Railway automatically sets `PORT` - you don't need to set it manually.

### Step 4: Deploy

1. Railway will automatically build and deploy
2. The build process will:
   - Install dependencies (`npm install`)
   - Start the server (`npm start`)
3. Railway will assign a public URL (e.g., `https://your-backend.up.railway.app`)

### Step 5: Update Frontend

Update your frontend's `REACT_APP_API_URL` to point to your Railway backend URL:
```
REACT_APP_API_URL=https://your-backend.up.railway.app/api/v1
```

## 📚 API Endpoints

### Health Check
```
GET /api/health
GET /api/v1/health
```
Returns server status.

### Questionnaire
```
POST /api/v1/questionnaire/save
GET /api/v1/questionnaire/me
```

### Contact Form
```
POST /api/v1/contact
```

### Conversations
```
GET /api/v1/conversations
GET /api/v1/conversations/:conversationId/messages
POST /api/v1/conversations/:conversationId/read
```

### WebSocket Events

**Client → Server:**
- `send_message` - Send a message
- `mark_read` - Mark messages as read
- `typing` - Send typing indicator

**Server → Client:**
- `receive_message` - Receive a new message
- `message_status_update` - Message status changed (sent/delivered/read)
- `conversation_updated` - Conversation list updated
- `messages_read` - Messages marked as read
- `message_blocked` - Message was blocked by moderation

## 🗄️ Database Schema

### Tables

- `messages` - Chat messages with status tracking
- `conversations` - Conversation metadata and unread counts
- `moderation_blacklist` - Blocked words/phrases
- `moderation_logs` - Moderation decision logs

See SQL files in the root directory for schema details.

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Supabase service role key |
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `FRONTEND_URL` | No | http://localhost:3000 | Frontend URL for CORS |
| `SMTP_HOST` | No | smtp.gmail.com | SMTP server host |
| `SMTP_PORT` | No | 587 | SMTP server port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `MODERATION_EMAIL` | No | ieeemetaverse@gmail.com | Email for moderation alerts |
| `ENABLE_AI_MODERATION` | No | false | Enable AI-based moderation |
| `OPENAI_API_KEY` | No | - | OpenAI API key (if AI moderation enabled) |

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── index.js     # Main config
│   │   └── supabase.js  # Supabase client
│   ├── controllers/     # Route controllers
│   │   ├── contactController.js
│   │   ├── conversationController.js
│   │   └── questionnaireController.js
│   ├── middleware/      # Express middleware
│   │   ├── errorHandler.js
│   │   ├── requireAuth.js
│   │   └── validateRequest.js
│   ├── routes/          # API routes
│   │   ├── contact.js
│   │   ├── conversations.js
│   │   ├── index.js
│   │   └── questionnaire.js
│   ├── services/        # Business logic services
│   │   ├── emailService.js
│   │   ├── moderationService.js
│   │   └── webhookService.js
│   ├── socket/          # Socket.io handlers
│   │   └── socketHandler.js
│   ├── utils/           # Utility functions
│   │   └── logger.js
│   └── server.js        # Server entry point
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── railway.json         # Railway deployment config
└── README.md
```

## 🔒 Security

- Environment variables are never committed to git
- Supabase Row Level Security (RLS) policies protect data
- CORS is configured to only allow requests from the frontend
- Authentication required for protected routes
- Message moderation prevents inappropriate content

## 🐛 Troubleshooting

### Server won't start

**Error: Missing required environment variables**
- Check that all required variables are set in `.env`
- Verify Supabase credentials are correct

**Error: Port already in use**
- Change `PORT` in `.env` to a different value
- Or kill the process using the port

### Database errors

**Error: Table does not exist**
- Run the SQL migration scripts in order
- Check Supabase dashboard for table existence

**Error: RLS policy violation**
- Verify RLS policies are enabled in Supabase
- Check that user is authenticated

### Email not sending

**Emails not being sent**
- Verify SMTP credentials in `.env`
- Check SMTP host and port settings
- For Gmail, use App Password (not regular password)
- See `EMAIL_SETUP_INSTRUCTIONS.md` for detailed setup

### Socket.io connection issues

**WebSocket connection failed**
- Verify `FRONTEND_URL` matches your frontend URL
- Check CORS configuration
- Ensure Socket.io server is running

## 📞 Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact: ieeemetaverse@gmail.com

## 📄 License

ISC

## 🙏 Acknowledgments

- Built with Express.js, Socket.io, and Supabase
- Deployed on Railway

