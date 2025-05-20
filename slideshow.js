const { BrowserWindow } = require( 'electron' );
const fs = require( 'fs' );
const path = require( 'path' );

class Slideshow
{
	constructor( folderPath, audioFolderPath, windowWidth = 1600, windowHeight = 900 )
	{
		this.folderPath = folderPath;
		this.audioFolderPath = audioFolderPath;
		this.windowWidth = windowWidth;
		this.windowHeight = windowHeight;
		this.images = [];
		this.audioFiles = [];
		this.window = null;
	}

	async init()
	{
		try
		{
			// Load images
			let imageFiles = await fs.promises.readdir( this.folderPath );
			imageFiles.sort( ( a, b ) => a.localeCompare( b, undefined, { sensitivity: 'base' } ) );
			this.images = imageFiles
				.filter( file => file.toLowerCase().endsWith( '.jpg' ) || file.toLowerCase().endsWith( '.jpeg' ) )
				.map( file => `file://${path.join( this.folderPath, file ).replace( /\\/g, '/' )}` );
			if ( this.images.length === 0 )
			{
				console.error( 'No JPG files found in the specified folder.' );
				return false;
			}

			// Load audio files
			let audioFiles = await fs.promises.readdir( this.audioFolderPath );
			audioFiles.sort( ( a, b ) => a.localeCompare( b, undefined, { sensitivity: 'base' } ) );
			this.audioFiles = audioFiles
				.filter( file => file.toLowerCase().endsWith( '.mp3' ) )
				.map( file => `file://${path.join( this.audioFolderPath, file ).replace( /\\/g, '/' )}` );
			if ( this.audioFiles.length === 0 )
			{
				console.warn( 'No MP3 files found in the specified audio folder. Proceeding without audio.' );
			}

			return true;
		} catch ( err )
		{
			console.error( 'Error reading folders:', err );
			return false;
		}
	}

	start()
	{
		const defaultFadeTime = 800;
		const defaultImageDuration = 3800;
		const finalFadeTime = 1200;
		const finalImageDuration = 5000;
		const finalPauseTime = 1000;
		const scaleFactor = 1.05;
		const PANSPEED_SCALE = 1.0;

		// Disable the menu bar
		Menu.setApplicationMenu( null );

		this.window = new BrowserWindow( {
			width: this.windowWidth,
			height: this.windowHeight,
			resizable: false,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
				preload: `${__dirname}/preload.js`
			}
		} );

		const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JPG Slideshow with Audio</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.2/p5.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.2/addons/p5.sound.min.js"></script>
    <style>
        body, html { margin: 0; padding: 0; overflow: hidden; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script>
        const images = ${JSON.stringify( this.images )};
        const audioFiles = ${JSON.stringify( this.audioFiles )};
        const defaultFadeTime = ${defaultFadeTime};
        const defaultImageDuration = ${defaultImageDuration};
        const finalFadeTime = ${finalFadeTime};
        const finalImageDuration = ${finalImageDuration};
        const finalPauseTime = ${finalPauseTime};
        const scaleFactor = ${scaleFactor};
        const PANSPEED_SCALE = ${PANSPEED_SCALE};
        let currentImage;
        let nextImage;
        let currentAudio;
        let currentIndex = 0;
        let audioIndex = 0;
        let currentAlpha = 0;
        let nextAlpha = 0;
        let phase = 'fadeIn';
        let lastSwitchTime = 0;
        let currentPanX = 0, currentPanY = 0, currentPanSpeedX = 0, currentPanSpeedY = 0, currentPanAngle = 0;
        let nextPanX = 0, nextPanY = 0, nextPanSpeedX = 0, nextPanSpeedY = 0, nextPanAngle = 0;
        let fadeTime = defaultFadeTime;
        let imageDuration = 2500; // initial image
		  console.log( "***1 imageDuration to " + imageDuration )
        let pauseTime = 0;
        let alphaStep = 255 / (fadeTime * 60 / 1000);
        let isFinalImage = false;
		  let isFirstImage = true;
        let isSlideshowActive = true;

        function preload() {
            if (images.length > 0) {
                currentImage = loadImage(images[0], 
                    () => console.log('Preload: Loaded image:', images[0]),
                    err => console.error('Preload: Error loading image:', images[0], err)
                );
                if (images.length > 1) {
                    nextImage = loadImage(images[1]);
                }
            }
            if (audioFiles.length > 0) {
                currentAudio = loadSound(audioFiles[0], 
                    () => console.log('Preload: Loaded audio:', audioFiles[0]),
                    err => console.error('Preload: Error loading audio:', audioFiles[0], err)
                );
            }
        }

        function setup() {
            createCanvas(windowWidth, windowHeight);
            console.log('Setup: Canvas created with dimensions:', windowWidth, 'x', windowHeight);
            background(0);
            setNewPanDirection('current');
            lastSwitchTime = millis();

            // Start audio playback
            if (audioFiles.length > 0) {
                playNextAudio();
            }
        }

        function playNextAudio() {
            if (!isSlideshowActive) return; // Stop audio playback if slideshow is done
            if (currentAudio) {
                currentAudio.stop(); // Stop any currently playing audio
            }
            currentAudio = loadSound(audioFiles[audioIndex], 
                () => {
                    if (isSlideshowActive) {
                        console.log('Playing audio:', audioFiles[audioIndex]);
                        currentAudio.play();
                        currentAudio.onended(() => {
                            audioIndex = (audioIndex + 1) % audioFiles.length;
                            playNextAudio(); // Play the next audio when this one ends
                        });
                    }
                },
                err => console.error('Error loading audio:', audioFiles[audioIndex], err)
            );
        }

        function draw() {
            background(0);
            let elapsed = millis() - lastSwitchTime;

            if (phase === 'fadeIn') {
                currentAlpha = min(currentAlpha + alphaStep, 255);
                if (elapsed >= fadeTime) {
                    currentAlpha = 255;
                    phase = 'display';
                }
            } else if (phase === 'display') {
                currentAlpha = 255;
                if (elapsed >= imageDuration) {
                    phase = 'crossfade';
                    if (isFinalImage) {
                        nextImage = null;
                    } else {
                        setNewPanDirection('next');
                    }
                }
            } else if (phase === 'crossfade') {
                currentAlpha = max(currentAlpha - alphaStep, 0);
                if (nextImage) {
                    nextAlpha = min(nextAlpha + alphaStep, 255 - currentAlpha);
                }
                if (currentAlpha <= 0) {
                    if (isFinalImage) {
                        phase = 'pause';
                    } else {
                        switchImage();
                        lastSwitchTime = millis();
                        phase = 'fadeIn';
                        currentAlpha = nextAlpha;
                        nextAlpha = 0;
                        currentPanX = nextPanX;
                        currentPanY = nextPanY;
                        currentPanSpeedX = nextPanSpeedX;
                        currentPanSpeedY = nextPanSpeedY;
                        currentPanAngle = nextPanAngle;
                    }
                }
            } else if (phase === 'pause') {
                if (elapsed >= imageDuration + fadeTime + pauseTime) {
                    console.log('Final image display complete. Stopping slideshow.');
                    isSlideshowActive = false;
                    if (currentAudio) {
                        currentAudio.stop();
                        console.log('Stopped audio at slideshow end');
                    }
                    window.electronAPI.closeWindow();
                    return;
                }
            }

            // Draw current image
            if (currentImage) {
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

                let maxPanX = (imgW - width) / 4;
                let maxPanY = (imgH - height) / 4;
                currentPanX += currentPanSpeedX;
                currentPanY += currentPanSpeedY;
                currentPanX = constrain(currentPanX, -maxPanX, maxPanX);
                currentPanY = constrain(currentPanY, -maxPanY, maxPanY);

                let x = width / 2 + currentPanX;
                let y = height / 2 + currentPanY;

               //  console.log('Draw: currentPanX:', currentPanX, 'currentPanY:', currentPanY, 'currentPanSpeedX:', currentPanSpeedX, 'currentPanSpeedY:', currentPanSpeedY, 'maxPanX:', maxPanX, 'maxPanY:', maxPanY);

                push();
                translate(x, y);
                imageMode(CENTER);
                tint(255, currentAlpha);
                image(currentImage, 0, 0, imgW, imgH);
                pop();
            }

            // Draw next image during crossfade
            if (nextImage && phase === 'crossfade') {
                let imgRatio = nextImage.width / nextImage.height;
                let canvasRatio = width / height;
                let imgW, imgH;
                if (imgRatio > canvasRatio) {
                    imgH = height * scaleFactor;
                    imgW = imgH * imgRatio;
                } else {
                    imgW = width * scaleFactor;
                    imgH = imgW / imgRatio;
                }

                let maxPanX = (imgW - width) / 4;
                let maxPanY = (imgH - height) / 4;
                nextPanX += nextPanSpeedX;
                nextPanY += nextPanSpeedY;
                nextPanX = constrain(nextPanX, -maxPanX, maxPanX);
                nextPanY = constrain(nextPanY, -maxPanY, maxPanY);

                let x = width / 2 + nextPanX;
                let y = height / 2 + nextPanY;

               //  console.log('Draw (next): nextPanX:', nextPanX, 'nextPanY:', nextPanY, 'nextPanSpeedX:', nextPanSpeedX, 'nextPanSpeedY:', nextPanSpeedY, 'maxPanX:', maxPanX, 'maxPanY:', maxPanY);

                push();
                translate(x, y);
                imageMode(CENTER);
                tint(255, nextAlpha);
                image(nextImage, 0, 0, imgW, imgH);
                pop();
            }
        }

        function switchImage() {
            currentIndex = (currentIndex + 1);

				let wasFirstImage = isFirstImage;
				isFirstImage = false;

				if ( wasFirstImage )
				{
					imageDuration = 200;
					console.log( "***3 imageDuration to " + imageDuration );
				}
				else
				{
					imageDuration = defaultImageDuration;
					console.log( "***4 imageDuration to " + imageDuration );
				}

            if (currentIndex === images.length - 1) {
                isFinalImage = true;
                fadeTime = finalFadeTime;
                imageDuration = finalImageDuration;
					 console.log( "***5 imageDuration to " + imageDuration );
                pauseTime = finalPauseTime;
                alphaStep = 255 / (fadeTime * 60 / 1000);
                console.log('Switching to final image with custom timing:', 
                    'fadeTime:', fadeTime, 
                    'imageDuration:', imageDuration, 
                    'pauseTime:', pauseTime);
            }
            if (currentIndex >= images.length) {
                return;
            }


            currentImage = nextImage || currentImage;
            nextImage = currentIndex + 1 < images.length ? loadImage(images[currentIndex + 1]) : null;
            setNewPanDirection('current');
        }

        function setNewPanDirection(type) {
            let panAngle, panX, panY, panSpeedX, panSpeedY;
            if (type === 'current') {
                panAngle = currentPanAngle;
                panX = currentPanX;
                panY = currentPanY;
                panSpeedX = currentPanSpeedX;
                panSpeedY = currentPanSpeedY;
            } else { // 'next'
                panAngle = nextPanAngle;
                panX = nextPanX;
                panY = nextPanY;
                panSpeedX = nextPanSpeedX;
                panSpeedY = nextPanSpeedY;
            }

            panAngle = random(TWO_PI);
            let imgRatio = (type === 'current' ? currentImage : nextImage).width / (type === 'current' ? currentImage : nextImage).height;
            let canvasRatio = windowWidth / windowHeight;
            let imgW, imgH;
            if (imgRatio > canvasRatio) {
                imgH = windowHeight * scaleFactor;
                imgW = imgH * imgRatio;
            } else {
                imgW = windowWidth * scaleFactor;
                imgH = imgW / imgRatio;
            }
            let maxPanX = (imgW - width) / 4;
            let maxPanY = (imgH - height) / 4;
            let totalDisplayTime = (type === 'current' && isFinalImage) ? finalImageDuration + finalFadeTime : defaultImageDuration + defaultFadeTime;
            let frames = (totalDisplayTime / 1000) * 60;
            panSpeedX = maxPanX > 0 ? (2 * maxPanX / frames) * cos(panAngle) : 0;
            panSpeedY = maxPanY > 0 ? (2 * maxPanY / frames) * sin(panAngle) : 0;
            panSpeedX *= PANSPEED_SCALE;
            panSpeedY *= PANSPEED_SCALE;
				if ( isFirstImage )
				{
					panSpeedX = 0;
					panSpeedY = 0;
				}
				
            panX = -maxPanX * cos(panAngle);
            panY = -maxPanY * sin(panAngle);

            if (type === 'current') {
                currentPanAngle = panAngle;
                currentPanX = panX;
                currentPanY = panY;
                currentPanSpeedX = panSpeedX;
                currentPanSpeedY = panSpeedY;
                console.log('SetNewPanDirection (current): angle:', currentPanAngle, 'speedX:', currentPanSpeedX, 'speedY:', currentPanSpeedY);
            } else { // 'next'
                nextPanAngle = panAngle;
                nextPanX = panX;
                nextPanY = panY;
                nextPanSpeedX = panSpeedX;
                nextPanSpeedY = panSpeedY;
                console.log('SetNewPanDirection (next): angle:', nextPanAngle, 'speedX:', nextPanSpeedX, 'speedY:', nextPanSpeedY);
            }
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