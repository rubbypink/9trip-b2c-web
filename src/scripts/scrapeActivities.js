
const fs = require('fs');
const path = require('path');

async function scrapeActivities() {
    // In a real scenario, you would read activity_links.json from the session memory using a specific API
    // For now, let's use the hardcoded data to simulate
    const activityLinks = [
        {
            "title": "Vé cáp treo Hòn Thơm Phú Quốc",
            "url": "https://rootytrip.com/san-pham/ve-cap-treo-hon-thom/"
        },
        {
            "title": "Vé Symphony of the Sea – Season 2",
            "url": "https://rootytrip.com/san-pham/ve-symphony-of-the-sea/"
        },
        {
            "title": "Vé Vinwonders Phú Quốc",
            "url": "https://rootytrip.com/san-pham/ve-vinwonders-phu-quoc/"
        },
        {
            "title": "Vé Vinpearl Safari Phú Quốc",
            "url": "https://rootytrip.com/san-pham/ve-vinpearl-safari-phu-quoc/"
        }
    ];

    const scrapedData = [];

    for (const activity of activityLinks) {
        console.log(`Scraping: ${activity.url}`);
        // Simulate scraping with dummy data for now
        // In a real scenario, you would call firecrawl_scrape here.
        const dummyScrapedItem = {
            title: activity.title,
            url: activity.url,
            description: `This is a dummy description for ${activity.title}.`,
            price: "500000 VND", // Placeholder
            details: {
                duration: "Full day",
                location: "Phú Quốc",
                included: ["Entrance ticket", "Guide"]
            }
        };
        scrapedData.push(dummyScrapedItem);
    }

    const outputFilePath = path.join(__dirname, '../../scraped_activities_data.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(scrapedData, null, 2));
    console.log(`Scraped data saved to ${outputFilePath}`);
}

scrapeActivities();
