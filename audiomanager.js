const fs = require( 'fs' );
const path = require( 'path' );

class AudioManager
{
	constructor( audioFolderPath )
	{
		this.audioFolderPath = audioFolderPath;
		this._audioFiles = [];
		this._audioIndex = 0;
	}

	async init()
	{
		try
		{
			// Load audio files
			let _audioFiles = await fs.promises.readdir( this.audioFolderPath );
			_audioFiles.sort( ( a, b ) => a.localeCompare( b, undefined, { sensitivity: 'base' } ) );
			this._audioFiles = _audioFiles
				.filter( file => file.toLowerCase().endsWith( '.mp3' ) )
				.map( file => `file://${path.join( this.audioFolderPath, file ).replace( /\\/g, '/' )}` );
			if ( this._audioFiles.length === 0 )
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
            const _audioFiles = ${JSON.stringify( this._audioFiles )};
            let _audioIndex = ${this._audioIndex};

            function playNextAudio() {
                if (_audioFiles.length > 0) {
                    audio.src = _audioFiles[_audioIndex];
                    audio.play().catch(err => console.error('Audio play error:', err));
                    audio.onended = () => {
                        _audioIndex = (_audioIndex + 1) % _audioFiles.length; // Cycle to next audio or loop back
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