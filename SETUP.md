# Setup & Deployment Guide

## Quick Start (5 minutes)

### Option 1: Next.js Project (Recommended for Vercel)

```bash
# Create new Next.js app
npx create-next-app@latest ipd-budget --typescript --tailwind

# Copy component file
cp ipd_budget_app.jsx app/components/

# Create home page
cat > app/page.jsx << 'EOF'
import IPDBudgetApp from '@/components/ipd_budget_app'

export default function Home() {
  return <IPDBudgetApp />
}
EOF

# Install dependencies
npm install recharts lucide-react

# Run development server
npm run dev
```

Visit `http://localhost:3000`

### Option 2: React Project (Vite)

```bash
# Create Vite React app
npm create vite@latest ipd-budget -- --template react

cd ipd-budget

# Copy component
cp ../ipd_budget_app.jsx src/components/

# Update src/App.jsx
cat > src/App.jsx << 'EOF'
import IPDBudgetApp from '@/components/ipd_budget_app'

export default function App() {
  return <IPDBudgetApp />
}
EOF

# Install dependencies
npm install recharts lucide-react
npm run dev
```

### Option 3: Standalone HTML + React

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IPD Budget App</title>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>

  <!-- React & Dependencies -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/recharts@2/dist/Recharts.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- App Component -->
  <script src="ipd_budget_app.jsx" type="module"></script>
</body>
</html>
```

## Vercel Deployment

### Step 1: Prepare Repository

```bash
# Initialize git repo
git init
git add .
git commit -m "Initial commit: IPD Budget App"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/ipd-budget.git
git push -u origin main
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or use Vercel web interface:
1. Go to https://vercel.com
2. Click "New Project"
3. Import from GitHub repository
4. Vercel auto-detects Next.js, click Deploy

### Step 3: Environment Setup

Create `.env.local`:

```bash
# Optional: API endpoints for future backend integration
NEXT_PUBLIC_API_URL=https://api.ipd.example.com
```

### Step 4: Verify Deployment

```bash
# Check deployment status
vercel ls

# Open production URL
vercel --prod
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application
COPY . .

# Build (if using Next.js)
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.9'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.ipd.example.com
    restart: unless-stopped
```

### Build & Run

```bash
# Build image
docker build -t ipd-budget .

# Run container
docker run -p 3000:3000 ipd-budget

# Or with docker-compose
docker-compose up -d
```

## Self-Hosted Deployment

### Prerequisites
- Node.js 18+
- 2GB RAM minimum
- 1GB disk space

### Installation

```bash
# Clone/copy project
cd /var/www/ipd-budget

# Install dependencies
npm ci --production

# Build
npm run build

# Set environment
export NODE_ENV=production
export PORT=3000

# Start with PM2 (recommended)
npm install -g pm2
pm2 start npm --name "ipd-budget" -- start
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name budget.ipd.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name budget.ipd.example.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/budget.ipd.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/budget.ipd.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location /_next/static {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d budget.ipd.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Environment Variables

### Development

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
DEBUG=true
```

### Production

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.ipd.example.com
LOG_LEVEL=info
```

## Database Integration (Future)

When adding backend API support:

```javascript
// Example: Fetching budgets from API
const [budgets, setBudgets] = useState(null);

useEffect(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets/2026`)
    .then(r => r.json())
    .then(data => setBudgets(data));
}, []);
```

## Authentication (Future)

Add NextAuth.js for user authentication:

```bash
npm install next-auth
```

Configure in `pages/api/auth/[...nextauth].js`:

```javascript
export const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Validate against IPD system
        const user = await authenticateIPDUser(credentials);
        return user;
      }
    })
  ]
}
```

## Monitoring & Logging

### Vercel Analytics

Automatically included with Vercel deployment. View in dashboard:
- Real User Monitoring (RUM)
- Web Vitals
- Performance metrics

### Application Logging

Add logging service:

```bash
npm install winston
```

```javascript
const logger = require('winston');
logger.info('Budget view accessed', { user, year: '2026' });
```

## Performance Optimization

### 1. Image Optimization
```bash
# Use Next.js Image component for charts
npm install next/image
```

### 2. Code Splitting
```javascript
// Load component on demand
import dynamic from 'next/dynamic';

const IPDBudgetApp = dynamic(() => import('@/components/ipd_budget_app'), {
  loading: () => <div>Loading...</div>
});
```

### 3. Caching Strategy
- Static: Chart data (revalidate hourly)
- Dynamic: Budget edits (real-time)
- CDN: CSS, fonts (365 days)

### Vercel Cache Configuration

```javascript
// next.config.js
module.exports = {
  onDemandISR: 3600, // Revalidate every hour
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600, stale-while-revalidate=86400'
        }
      ]
    }
  ]
}
```

## Security Checklist

- [ ] Enable HTTPS
- [ ] Set Content Security Policy headers
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets
- [ ] Enable CORS properly
- [ ] Add rate limiting
- [ ] Audit dependencies (`npm audit`)
- [ ] Enable 2FA on GitHub/Vercel
- [ ] Regular security updates
- [ ] Database encryption at rest

## Maintenance

### Regular Tasks

```bash
# Update dependencies
npm outdated
npm update

# Security audit
npm audit
npm audit fix

# Test before deploy
npm test
npm run build

# Monitor logs
vercel logs [deployment-url]
```

### Backup Strategy

```bash
# Backup database (when implemented)
mysqldump -u user -p database > backup-$(date +%Y%m%d).sql

# Backup configuration
tar czf config-backup-$(date +%Y%m%d).tar.gz .env.production

# Archive to storage
aws s3 cp config-backup-*.tar.gz s3://ipd-backups/
```

## Troubleshooting

### Issue: Charts not rendering
```javascript
// Ensure Recharts is properly imported
import { BarChart, Bar, ... } from 'recharts';
// Not from 'recharts/dist/Recharts'
```

### Issue: Tailwind styles not applied
```bash
# Rebuild Tailwind
npx tailwindcss -i ./src/input.css -o ./src/output.css
```

### Issue: Out of memory
```bash
# Increase Node.js heap
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Issue: Slow builds
```bash
# Check build time
time npm run build

# Analyze bundle
npm install -D @next/bundle-analyzer
```

## Support & Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org)

---

**Last Updated**: March 29, 2026
**Version**: 1.0.0
