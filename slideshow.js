const { BrowserWindow } = require( 'electron' );
const fs = require( 'fs' );
const path = require( 'path' );

class Slideshow
{
	constructor( folderPath, windowWidth = 800, windowHeight = 600 )
	{
		this.folderPath = folderPath;
		this.windowWidth = windowWidth;
		this.windowHeight = windowHeight;
		this.images = [];
		this.window = null;
	}

	async init()
	{
		try
		{
			let files = await fs.promises.readdir( this.folderPath );
			files.sort( ( a, b ) => a.localeCompare( b, undefined, { sensitivity: 'base' } ) );
			this.images = files
				.filter( file => file.toLowerCase().endsWith( '.jpg' ) || file.toLowerCase().endsWith( '.jpeg' ) )
				.map( file => `file://${path.join( this.folderPath, file ).replace( /\\/g, '/' )}` );
			if ( this.images.length === 0 )
			{
				console.error( 'No JPG files found in the specified folder.' );
				return false;
			}
			return true;
		} catch ( err )
		{
			console.error( 'Error reading folder:', err );
			return false;
		}
	}

	start()
	{
		const fadeTime = 800;
		const imageDuration = 2400;
		const pauseTime = 250;
		const alphaStep = 255 / ( ( fadeTime / 2 ) * 60 / 1000 );

		this.window = new BrowserWindow( {
			width: this.windowWidth,
			height: this.windowHeight,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false
			}
		} );

		const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JPG Slideshow</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.2/p5.min.js"></script>
    <style>
        body, html { margin: 0; padding: 0; overflow: hidden; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script>
        const images = ${JSON.stringify( this.images )};
        const fadeTime = ${fadeTime};
        const imageDuration = ${imageDuration};
        const pauseTime = ${pauseTime};
        const alphaStep = ${alphaStep};
        let currentImage;
        let nextImage;
        let currentIndex = 0;
        let alpha = 0;
        let phase = 'fadeIn';
        let lastSwitchTime = 0;
        let panX = 0;
        let panY = 0;
        let panSpeedX = 0;
        let panSpeedY = 0;
        let scaleFactor = 1.2;

        function preload() {
            if (images.length > 0) {
                currentImage = loadImage(images[0]);
                if (images.length > 1) {
                    nextImage = loadImage(images[1]);
                }
            }
        }

        function setup() {
            createCanvas(windowWidth, windowHeight);
            setNewPanDirection();
            lastSwitchTime = millis();
        }

        function draw() {
            background(0);
            let elapsed = millis() - lastSwitchTime;
            if (phase === 'fadeIn') {
                alpha = min(alpha + alphaStep, 255);
                if (elapsed >= fadeTime / 2) {
                    alpha = 255;
                    phase = 'display';
                }
            } else if (phase === 'display') {
                alpha = 255;
                if (elapsed >= imageDuration - (fadeTime / 2)) {
                    phase = 'fadeOut';
                }
            } else if (phase === 'fadeOut') {
                alpha = max(alpha - alphaStep, 0);
                if (alpha <= 0) {
                    phase = 'pause';
                }
            } else if (phase === 'pause') {
                alpha = 0;
                if (elapsed >= imageDuration + pauseTime) {
                    switchImage();
                    lastSwitchTime = millis();
                    phase = 'fadeIn';
                    alpha = 0;
                }
            }
            if (currentImage && phase !== 'pause') {
                let imgRatio = currentImage.width / currentImage.height;
                let canvasRatio = width / height;
                let imgW, imgH;
                if (imgRatio > canvasRatio) {
                    imgH = height * scaleFactor;
                    imgW = imgH * imgRatio;
                } else {
                    imgW = width * scaleFactor;
                    imgH = imgW / imgRatio;
                }
                panX += panSpeedX;
                panY += panSpeedY;
                let maxPanX = (imgW - width) / 2;
                let maxPanY = (imgH - height) / 2;
                panX = constrain(panX, -maxPanX, maxPanX);
                panY = constrain(panY, -maxPanY, maxPanY);
                let x = width / 2 + panX;
                let y = height / 2 + panY;
                push();
                translate(x, y);
                imageMode(CENTER);
                tint(255, alpha);
                image(currentImage, 0, 0, imgW, imgH);
                pop();
            }
        }

        function switchImage() {
            currentIndex = (currentIndex + 1) % images.length;
            currentImage = nextImage || currentImage;
            nextImage = images[currentIndex + 1] ? loadImage(images[currentIndex + 1]) : null;
            setNewPanDirection();
        }

        function setNewPanDirection() {
            let angle = random(TWO_PI);
            let speed = 0.5;
            panSpeedX = cos(angle) * speed;
            panSpeedY = sin(angle) * speed;
            panX = 0;
            panY = 0;
        }

        function windowResized() {
            resizeCanvas(windowWidth, windowHeight);
        }
    </script>
</body>
</html>
        `;

		try
		{
			const htmlPath = path.join( __dirname, 'slideshow.html' );
			fs.writeFileSync( htmlPath, htmlContent );
			this.window.loadURL( `file://${htmlPath}` );
		} catch ( err )
		{
			console.error( 'Error writing HTML file:', err );
			throw err;
		}
	}

	cleanup()
	{
		if ( this.window && !this.window.isDestroyed() )
		{
			this.window.close();
			this.window = null;
		}
		console.log( 'Slideshow stopped' );
	}
}

module.exports = Slideshow;