function test()
{
	let TWO_PI = 6.2831855;
	console.log( "let nums = [" )
	for ( let i = 0; i < 22 * 3; i++ )
	{
		// nums.push( random( TWO_PI ) );
		console.log( ( Math.random() * TWO_PI ) + ", " )
	}
	console.log( "]" )
}
test()