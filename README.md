# Project Gutenberg Book Search

A demonstration project showing how to build an ethical web scraping application using Puppeteer in a Docker container, deployed on DigitalOcean App Platform.

## Features

- Search through Project Gutenberg's vast library of public domain books
- View detailed book information including:
  - Title and author
  - Publication date
  - Download statistics
  - Available formats
  - Subject categories
- Implements proper rate limiting (1 request per second)
- Respects robots.txt guidelines
- Clean, responsive UI built with Bootstrap
- Containerized with Docker
- Ready for deployment on DigitalOcean App Platform

## Technical Stack

- Node.js
- Express.js
- Puppeteer for web scraping
- EJS for templating
- Bootstrap for UI
- Docker for containerization

## Best Practices Demonstrated

1. **Ethical Web Scraping**
   - Proper rate limiting (1 request/second)
   - Descriptive User-Agent
   - Respect for robots.txt
   - Error handling and retries

2. **Docker Best Practices**
   - Multi-stage builds
   - Non-root user
   - Security considerations
   - Resource optimization

3. **Code Organization**
   - Modular architecture
   - Service-based structure
   - Clean separation of concerns
   - Error handling

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gutenberg-scraper.git
   cd gutenberg-scraper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Visit `http://localhost:8080`

## Docker Development

1. Build the container:
   ```bash
   docker build -t gutenberg-scraper .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:8080 gutenberg-scraper
   ```

## Deployment to DigitalOcean App Platform

1. Fork this repository to your GitHub account

2. In the DigitalOcean Console:
   - Create a new app
   - Select your forked repository
   - Choose the Docker source
   - Configure environment variables if needed
   - Deploy!

## Environment Variables

- `PORT`: Application port (default: 8080)
- `NODE_ENV`: Environment setting (development/production)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Educational Resources

This project serves as an example for several important concepts:

1. Web Scraping Ethics
   - Rate limiting implementation
   - Proper user agent identification
   - Respecting website terms of service

2. Docker Containerization
   - Multi-stage builds
   - Security considerations
   - Resource optimization

3. Cloud Deployment
   - DigitalOcean App Platform setup
   - Container orchestration
   - Environment configuration

## License

ISC License - See LICENSE file for details 