const { app, BrowserWindow, contextBridge, ipcMain } = require( 'electron' );
const Slideshow = require( './slideshow.js' );

const folderPath = 'd:/depots/gen_slideshow_group/images';
const audioFolderPath = 'd:/depots/gen_slideshow_group/audio';
const windowWidth = 1920 * ( 0.8 ) + 4; // * 0.3;
const windowHeight = 1080 * ( 0.8 ) + 4; // * 0.3;

let mainWindow;

app.whenReady().then( async () =>
{
	mainWindow = new BrowserWindow( {
		width: windowWidth,
		height: windowHeight,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: `${__dirname}/preload.js`
		}
	} );

	const slideshow = new Slideshow( folderPath, audioFolderPath, windowWidth, windowHeight );
	try
	{
		const success = await slideshow.init();
		if ( success )
		{
			slideshow.start();
		} else
		{
			console.error( 'Slideshow initialization failed. Check if the folders exist and contain JPG and MP3 files.' );
			app.quit();
		}
	} catch ( err )
	{
		console.error( 'Error reading folders or starting slideshow:', err );
		app.quit();
	}
} );

ipcMain.on( 'close-window', () =>
{
	if ( mainWindow && !mainWindow.isDestroyed() )
	{
		mainWindow.close();
	}
} );

app.on( 'window-all-closed', () =>
{
	if ( process.platform !== 'darwin' )
	{
		app.quit();
	}
} );