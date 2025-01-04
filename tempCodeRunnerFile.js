// Middleware
applyMiddlewares(app);

app.use('/public', express.static(path.join(__dirname, 'public')));