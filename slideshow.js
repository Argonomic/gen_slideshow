const { BrowserWindow, Menu } = require( 'electron' );
const fs = require( 'fs' );
const path = require( 'path' );
const AudioManager = require( './audioManager.js' );

const windowWidth = 1920 * ( 2 / 3 ) + 4;
const windowHeight = 1080 * ( 2 / 3 ) + 4;


class Slideshow
{
	constructor( folderPath, audioFolderPath, windowWidth = windowWidth, windowHeight = windowHeight )
	{
		this.folderPath = folderPath;
		this.audioFolderPath = audioFolderPath;
		this.windowWidth = windowWidth;
		this.windowHeight = windowHeight;
		this.images = [];
		this.audioFiles = [];

		this.audioManager = new AudioManager( audioFolderPath );
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

			// Initialize new audio
			const audioSuccess = await this.audioManager.init();
			if ( !audioSuccess )
			{
				console.warn( 'Audio initialization failed. Proceeding without audio.' );
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
		const FAST_INTRO = false;
		const MULT = 1.0;
		const defaultFadeTime = ( 800 * 1.0 ) * MULT;
		const defaultImageDuration = ( 2330 + 220 ) * MULT; // ( 2330 + 240 ) * MULT;
		const secondToLastFadeTime = 200;
		const secondToLastImageDuration = 200;
		const secondToLastPauseTime = 200;
		const scaleFactor = 0.4; // 1.05;
		let PANSPEED_SCALE = 0.5;
		let ALTERNATE = -300;
		const OLD_AUDIO_ENABLED = false;
		const NEW_AUDIO_ENABLED = true;

		// Disable the menu bar
		// Menu.setApplicationMenu( null );

		this.window = new BrowserWindow( {
			width: this.windowWidth,
			height: this.windowHeight,
			frame: true, // toggle for title bar
			resizable: false,
			transparent: false,
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
    <audio id="backgroundAudio"></audio>
    <script>
		     //               window.audioAPI.startPlayback(); // new

		const FAST_INTRO = ${FAST_INTRO};
        const images = ${JSON.stringify( this.images )};
        const audioFiles = ${JSON.stringify( this.audioFiles )}; // old
        const defaultFadeTime = ${defaultFadeTime};
        const defaultImageDuration = ${defaultImageDuration};
        const secondToLastFadeTime =  ${secondToLastFadeTime};
		const OLD_AUDIO_ENABLED = ${OLD_AUDIO_ENABLED};
		const NEW_AUDIO_ENABLED = ${NEW_AUDIO_ENABLED};
        const secondToLastImageDuration =  ${secondToLastImageDuration};
        const secondToLastPauseTime		   =  ${secondToLastPauseTime};
        const scaleFactor = ${scaleFactor};
        let PANSPEED_SCALE = ${PANSPEED_SCALE};
		let ALTERNATE = ${ALTERNATE};
        let currentImage;
        let nextImage;
		let lastPhase = "";
		let lastPhaseChangeTime = 0;
        let currentAudio;
        let currentIndex = 0;
        let audioIndex = 0;
        let currentAlpha = 0;
		let personalImageTracker = 0;
        let nextAlpha = 0;
        let phase = 'fadeIn';
        let lastSwitchTime = 0;
        let currentPanX = 0, currentPanY = 0, currentPanSpeedX = 0, currentPanSpeedY = 0, currentPanAngle = 0;
        let nextPanX = 0, nextPanY = 0, nextPanSpeedX = 0, nextPanSpeedY = 0, nextPanAngle = 0;
        let fadeTime = defaultFadeTime;
        let imageDuration = 0; // = 2500; // initial image
		//   console.log( "***1 imageDuration to " + imageDuration )
        let pauseTime = 0;
        let alphaStep = 255 / (fadeTime * 60 / 1000);
		let isSecondToLastImage = false;

        let isSlideshowActive = true;

		let angleIndex = 0;
		let angles = [
			
			0, // intro

			// allie
			1.1328128513496225, 
			5.627222058910939,  // maybe fix overlap
			0.7408116605321027, 
			
			// august
			1.5908302596333452, 
			2.355196958215871, 
			5.7159306747722938,
			
			// charlie
			2.624366046866113, 
			1.2599736763402498, 
			0.1393499871660995, // push out a bit to the left?  // 0.8393499871660995, // push out a bit to the left? 
			
			// dawson
			1.271983183588195, 
			3.8340514250170651, 
			0.991458619971771, 
			
			// elise
			3.7450459812105206,  
			1.85717875157505, 
			3.6277446855814743,
			
			// ella
			1.09429879134978553, 
			3.97330752116559, 
			4.906361185085047, 
			
			// florence
			1.949627383241286,
			6.207538973606385, 
			4.664837733761826, 
			
			// george
			0.9673177948605645, 
			2.759786645166142, 
			5.10903091809768686, // 3.10903091809768686, 

			// jack
			0.9077026323558282, 
			0.5755051317961674, 
			4.445124816868618, 

			// jaimin
			1.1234769935895645, 
			1.376347463418245, 
			0.5427511040870574, 

			// khushi
			2.5704497756635276, 
			0.2537633162564111, 
			4.859970098714183,

			// kinsey
			0.8199494650911996,
			2.580212368228481, 
			3.748572423408948, 

			// lainey
			4.542229816677456, 
			0.2537633162564111, 
			5.3741188239300035, 

			// leo
			4.734727630971292, 
			1.8293759752188661,
			1.610347038106177, 

			// linly
			2.068418954339531, 
			5.259825421263206,
			1.261502342642173, 

			// matilda
			5.337361865809745, 
			2.068418954339531, 
			4.008512307724525, 

			// naomi
			1.872948294615419,  // swap #1 and #2  
			5.1951734496561937,
			2.1953111155025478, 

			// nich
			2.9790893770367353, 
			5.172830276540797, // 2.172830276540797, 
			1.347414474126533, 

			// olu
			0.09192543600446, 
			5.790926008729001, // swap #2 and #3
			3.834695848281068, 

			// ryland
			0.8199494650911996,
			0.4537633162564111, 
			4.9965324544079333, 

			// spencer
			1.2290334012423494, 
			5.385676033618444,  // ****
			4.2537633162564111, 

			// william
			2.580212368228481, 
			3.748572423408948, 
			4.542229816677456, 
		]


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
            if (audioFiles.length > 0 && OLD_AUDIO_ENABLED) {
				// console.log( "LEZZ PLAY DAT AUDIOSS" )
                currentAudio = loadSound(audioFiles[0], 
                    () => console.log('Preload: Loaded audio:', audioFiles[0]),
                    err => console.error('Preload: Error loading audio:', audioFiles[0], err)
                );
            }
        }

        function setup() {
            createCanvas(windowWidth, windowHeight);
            // console.log('Setup: Canvas created with dimensions:', windowWidth, 'x', windowHeight);
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
                    if (isSlideshowActive && OLD_AUDIO_ENABLED) {
                        // console.log('Playing audio:', audioFiles[audioIndex]);
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

            if (phase === 'fadeIn') 
			{
                currentAlpha = min(currentAlpha + alphaStep, 255);
				if ( personalImageTracker == 1 && elapsed >= fadeTime + 650 || personalImageTracker != 1 && currentAlpha >= 255 )
				{
                    currentAlpha = 255;
                    phase = 'secondImage_FadeIn';
                    setNewPanDirection('next');
                }
            } 
			else if (phase === 'secondImage_FadeIn') 
			{
				currentAlpha = 255;
                if (nextImage)
				{
                    nextAlpha = min(nextAlpha + alphaStep, 255);
					if ( nextAlpha >= 255 )
					{
						phase = 'crossfade_PLAY';
						nextAlpha = 255;
					}
                }
            } 
			else if (phase === 'crossfade_PLAY') 
			{
				currentAlpha = 255;
                if (nextImage) 
				{
					nextAlpha = 255;
                }

				if ( personalImageTracker >= 2 )
				{
					if (elapsed >= imageDuration * 1.35 )
					{
						personalImageTracker += 1;
						phase = 'allfade_OUT';
					}
				}
				else
				{
					if (elapsed >= imageDuration * 2.0 )
					{
						personalImageTracker += 1;
						phase = 'crossfade_OUT';
					}
				}
            } 
			else if (phase === 'crossfade_OUT') 
			{
                currentAlpha = max(currentAlpha - alphaStep, 0);

                if ( nextImage )
					nextAlpha = 255;

                if (currentAlpha <= 0) 
				{
					switchImage();
		            // setNewPanDirection('current');

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
			else if (phase === 'allfade_OUT') 
			{
				if ( elapsed >= 2800 )
				{
	                currentAlpha = max(currentAlpha - ( alphaStep ), 0);
    	            if ( nextImage )
					{
	        	        nextAlpha = max(nextAlpha - alphaStep, 0);
					}
				}
				// console.log( "all fade elapsed time " + elapsed )

                if ( currentAlpha <= 0 && nextAlpha <= 0 && elapsed > 3600 )
				{
					personalImageTracker = 1;

					switchImage();
					switchImage();
		            setNewPanDirection('next');

					lastSwitchTime = millis();
					phase = 'fadeIn';
                    currentAlpha = 0; // nextAlpha;
					nextAlpha = 0;
					currentPanX = nextPanX;
					currentPanY = nextPanY;
					currentPanSpeedX = nextPanSpeedX;
					currentPanSpeedY = nextPanSpeedY;
					currentPanAngle = nextPanAngle;
                }
            } 

			if ( phase != lastPhase )
			{
				// console.log( "" )
				// console.log( "" )
				// console.log( "***********************************************************************" )
				console.log( "**** PHASE: " + phase + ", elasped: " + elapsed )
				lastPhase = phase;
				lastPhaseChangeTime = millis();
			}
			// console.log( "currentAlpha " + currentAlpha + ", nextAlpha:" + nextAlpha )

            // Draw current image
            if ( currentImage ) 
			{
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
					 // wip
               //  currentPanX = constrain(currentPanX, -maxPanX, maxPanX);
               //  currentPanY = constrain(currentPanY, -maxPanY, maxPanY); 

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

            // Draw next image during secondImage_FadeIn
            if (nextImage && ( phase === 'allfade_OUT' || phase === 'secondImage_FadeIn' || phase === 'crossfade_OUT' || phase === 'crossfade_PLAY' ) ) {
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
				// console.log( "nextPanX:" + nextPanX + " nextPanSpeedX: " + nextPanSpeedX )
                // nextPanX = constrain(nextPanX, -maxPanX, maxPanX);
                // nextPanY = constrain(nextPanY, -maxPanY, maxPanY);


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

        function switchImage() 
		{
            currentIndex = (currentIndex + 1);

			imageDuration = defaultImageDuration;

			if ( currentIndex === images.length - 2 )
			{
				isSecondToLastImage = true;
				fadeTime = secondToLastFadeTime;
				imageDuration = secondToLastImageDuration;
				pauseTime = secondToLastPauseTime;
				// console.log( "***6 imageDuration to " + imageDuration );
			}

			if (currentIndex >= images.length) 
			{
				return;
			}

            currentImage = nextImage || currentImage;
            nextImage = currentIndex + 1 < images.length ? loadImage(images[currentIndex + 1]) : null;
        }

        function setNewPanDirection(type) 
		{
            let panAngle, panX, panY, panSpeedX, panSpeedY;
            if (type === 'current')
			{
                panAngle = currentPanAngle;
                panX = currentPanX;
                panY = currentPanY;
                panSpeedX = currentPanSpeedX;
                panSpeedY = currentPanSpeedY;
				
				// console.log( "--3 panspeed to " + panSpeedX )
            }
			else 
			{ // 'next'
                panAngle = nextPanAngle;
                panX = nextPanX;
                panY = nextPanY;
                panSpeedX = nextPanSpeedX;
                panSpeedY = nextPanSpeedY;
				// console.log( "--4 panspeed to " + panSpeedX )
            }

            // panAngle = random(TWO_PI);
			panAngle = angles[angleIndex];
			console.log( " ** panAngle: " + panAngle + " index " + angleIndex )
			angleIndex++;
			angleIndex %= angles.length;

            let imgRatio = (type === 'current' ? currentImage : nextImage).width / (type === 'current' ? currentImage : nextImage).height;
            let canvasRatio = windowWidth / windowHeight;
            let imgW, imgH;
            if (imgRatio > canvasRatio) 
			{
                imgH = windowHeight * scaleFactor;
                imgW = imgH * imgRatio;
            }
			else
			{
                imgW = windowWidth * scaleFactor;
                imgH = imgW / imgRatio;
            }

            let maxPanX = (imgW - width) / 4;
            let maxPanY = (imgH - height) / 4;
			// console.log( "maxPanX:" + maxPanX + ", maxPanY:" + maxPanY )
				
			let totalDisplayTime = defaultImageDuration + defaultFadeTime;
			if ( type === 'current' )
			{
				if ( isSecondToLastImage )
					totalDisplayTime = secondToLastImageDuration + secondToLastFadeTime;
			}

            let frames = (totalDisplayTime / 1000) * 60;
            // panSpeedX = maxPanX > 0 ? (2 * maxPanX / frames) * cos(panAngle) : 0;
            panSpeedX = (2 * maxPanX / frames) * cos(panAngle) * 0.1;
            panSpeedY = (2 * maxPanY / frames) * sin(panAngle) * 2.0;

			for ( ;; )
			{
				if ( Math.abs( panSpeedY ) < 2.5 )
					break
				panSpeedY *= 0.85;
			}
			

			// console.log( "--1 panspeed to " + panSpeedX + ":" + panSpeedY )

			// panSpeedY = maxPanY > 0 ? (2 * maxPanY / frames) * sin(panAngle) : 0;
            panSpeedX *= PANSPEED_SCALE;
            panSpeedY *= PANSPEED_SCALE;
			if ( Math.abs( panSpeedY ) > 2.0 )
				panSpeedY *= 0.5;

			// let rand_x = -500 + ( Math.random() * 1000 );
			// console.log( "Rand_x " + rand_x )
            panX = -maxPanX * cos(panAngle);
			// console.log ( "ALTERNATE " + ALTERNATE + ", panX " + panX )

			if ( ALTERNATE < 0 )
				panX += ALTERNATE * 0.8;
			else
				panX += ALTERNATE * 0.8;

            panY = -maxPanY * sin(panAngle);

            if (type === 'current') {
                currentPanAngle = panAngle;
                currentPanX = panX;
                currentPanY = panY;
                currentPanSpeedX = panSpeedX;
                currentPanSpeedY = panSpeedY;
                // console.log('SetNewPanDirection (current): angle:', currentPanAngle, 'speedX:', currentPanSpeedX, 'speedY:', currentPanSpeedY);
            } else { // 'next'
				ALTERNATE = ALTERNATE * -1;
                nextPanAngle = panAngle;
                nextPanX = panX;
                nextPanY = panY;
                nextPanSpeedX = panSpeedX;
                nextPanSpeedY = panSpeedY;
                // console.log('SetNewPanDirection (next): angle:', nextPanAngle, 'speedX:', nextPanSpeedX, 'speedY:', nextPanSpeedY);
            }
        }

        function windowResized() {
            resizeCanvas(windowWidth, windowHeight);
        }

		if ( NEW_AUDIO_ENABLED )
		{
			${this.audioManager.getAudioScript()};
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