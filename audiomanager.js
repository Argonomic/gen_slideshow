const fs = require( 'fs' );
const path = require( 'path' );

class AudioManager
{
	constructor( audioFolderPath )
	{
		this.audioFolderPath = audioFolderPath;
		this.audioFiles = [];
		this.audioIndex = 0;
	}

	async init()
	{
		try
		{
			// Load audio files
			let audioFiles = await fs.promises.readdir( this.audioFolderPath );
			audioFiles.sort( ( a, b ) => a.localeCompare( b, undefined, { sensitivity: 'base' } ) );
			this.audioFiles = audioFiles
				.filter( file => file.toLowerCase().endsWith( '.mp3' ) )
				.map( file => `file://${path.join( this.audioFolderPath, file ).replace( /\\/g, '/' )}` );
			if ( this.audioFiles.length === 0 )
			{
				console.warn( 'No MP3 files found in the specified audio folder. Proceeding without audio.' );
				return false;
			}
			return true;
		} catch ( err )
		{
			console.error( 'Error reading audio folder:', err );
			return false;
		}
	}

	getAudioScript()
	{
		return `
            const audio = document.getElementById('backgroundAudio');
            const audioFiles = ${JSON.stringify( this.audioFiles )};
            let audioIndex = ${this.audioIndex};

            function playNextAudio() {
                if (audioFiles.length > 0) {
                    audio.src = audioFiles[audioIndex];
                    audio.play().catch(err => console.error('Audio play error:', err));
                    audio.onended = () => {
                        audioIndex = (audioIndex + 1) % audioFiles.length; // Cycle to next audio or loop back
                        playNextAudio();
                    };
                }
            }

            window.audioAPI = {
                startPlayback: () => {
                    playNextAudio();
                }
            };
        `;
	}
}

module.exports = AudioManager;