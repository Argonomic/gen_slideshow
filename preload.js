const { contextBridge, ipcRenderer } = require( 'electron' );

contextBridge.exposeInMainWorld( 'electronAPI', {
	closeWindow: () => ipcRenderer.send( 'close-window' )
} );

contextBridge.exposeInMainWorld( 'audioAPI', {
	startPlayback: () => { } // Placeholder, implemented in slideshow.html
} );