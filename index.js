const { app } = require( 'electron' );
const Slideshow = require( './slideshow.js' );

const folderPath = 'd:/depots/gen_slideshow_download/images'; // Adjust to your images folder
const windowWidth = 1600; // Set your desired width
const windowHeight = 900; // Set your desired height

app.whenReady().then( async () =>
{
	const slideshow = new Slideshow( folderPath, windowWidth, windowHeight );
	try
	{
		const success = await slideshow.init();
		if ( success )
		{
			slideshow.start();
		} else
		{
			console.error( 'Slideshow initialization failed. Check if the folder exists and contains JPG files.' );
			app.quit();
		}
	} catch ( err )
	{
		console.error( 'Error reading folder or starting slideshow:', err );
		app.quit();
	}
} );

app.on( 'window-all-closed', () =>
{
	if ( process.platform !== 'darwin' )
	{
		app.quit();
	}
} );