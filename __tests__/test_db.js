const videoDb = require('../lib/db/video');

it('should find two videos', async () => {
    const videos = await videoDb.get('44a4efaa-7fb3-4498-9571-06b9fe6b6841', ["360b8f49-3c98-4020-ac72-83f958405239", "015b673c-be52-408b-99bd-4117031401c7"]);
    expect(videos.length).toBe(2);
});

it('should find one video', async () => {
    const id = "360b8f49-3c98-4020-ac72-83f958405239";
    const video = (await videoDb.get('44a4efaa-7fb3-4498-9571-06b9fe6b6841', id))[0];
    expect(video.id).toBe(id);
});
