
// homeController.js
const getHomePage = (req, res) => {
	res.render('index', { title: 'Home Page' });
};


export default getHomePage;