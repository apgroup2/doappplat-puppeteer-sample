const express = require('express');
const path = require('path');
const bookService = require('./services/bookService');
const app = express();
const port = process.env.PORT || 8080;

// Set up middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

async function process1() {
    // Asynchronous operation for process 1
    return new Promise(resolve => bookService.searchBooks('test', 1))
  }
  
  async function process2() {
    // Asynchronous operation for process 2
    return new Promise(resolve => bookService.searchBooks('test', 2))
  }
  
  async function process3() {
    // Asynchronous operation for process 3
    return new Promise(resolve => bookService.searchBooks('test', 3))
  }

app.get('/search', async (req, res) => {
    try {
        const { query, page = 1 } = req.query;
        if (!query) {
            return res.render('index', { error: 'Please enter a search query' });
        }

        try {
            const results = await Promise.all([process1(), process2(), process3()]);
            console.log("All processes completed:", results);
          } catch (error) {
            console.error("An error occurred:", error);
          }        

        /*
        const books = await bookService.searchBooks(query, parseInt(page));
        res.render('results', { 
            books,
            query,
            currentPage: parseInt(page),
            error: null
        });
        */
    } catch (error) {
        console.error('Search error:', error);
        res.render('results', { 
            books: [],
            query: req.query.query,
            currentPage: 1,
            error: 'Failed to search books. Please try again.'
        });
    }
});

app.get('/book/:url(*)', async (req, res) => {
    try {
        const bookUrl = req.params.url;
        const { query, page } = req.query;
        
        if (!bookUrl.startsWith('https://www.gutenberg.org')) {
            return res.status(400).render('error', { 
                error: 'Invalid book URL' 
            });
        }

        const bookDetails = await bookService.getBookDetails(bookUrl);
        res.render('book', { 
            book: bookDetails, 
            error: null,
            searchQuery: query,
            searchPage: page
        });
    } catch (error) {
        console.error('Book details error:', error);
        res.render('book', { 
            book: null, 
            error: 'Failed to fetch book details. Please try again.',
            searchQuery: req.query.query,
            searchPage: req.query.page
        });
    }
});

// Add global error handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing browser...');
    await bookService.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Closing browser...');
    await bookService.close();
    process.exit(0);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server starting on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
}); 