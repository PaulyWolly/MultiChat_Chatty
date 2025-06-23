// Test file to verify YouTube refactoring
async function testYouTubeRefactor() {
    console.log('🧪 Testing YouTube Refactoring...');

    // Test 1: Check if YouTubeSearchManager is properly imported
    try {
        const { default: YouTubeSearchManager } = await import('./public/components/YouTubeSearch/YouTubeSearchManager.js');
        console.log('✅ YouTubeSearchManager import successful');
        
        // Test 2: Check if component can be instantiated
        const manager = new YouTubeSearchManager();
        console.log('✅ YouTubeSearchManager instantiation successful');
        
        // Test 3: Check if key methods exist
        const requiredMethods = [
            'isYouTubeQuery',
            'handleYoutubeRequest', 
            'scrollToYouTubeResults',
            'renderMinimizedPaginatorBar',
            'init'
        ];
        
        for (const method of requiredMethods) {
            if (typeof manager[method] === 'function') {
                console.log(`✅ Method ${method} exists`);
            } else {
                console.log(`❌ Method ${method} missing`);
            }
        }
        
        // Test 4: Test YouTube query detection
        const testQueries = [
            'youtube search cats',
            'youtube channel music',
            'youtube funny videos',
            'hello world',
            'search for something'
        ];
        
        console.log('\n🧪 Testing YouTube query detection:');
        testQueries.forEach(query => {
            const isYouTube = manager.isYouTubeQuery(query);
            console.log(`"${query}" -> ${isYouTube ? 'YouTube' : 'Not YouTube'}`);
        });
        
        console.log('\n🎉 YouTube refactoring tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testYouTubeRefactor(); 