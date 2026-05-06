#!/usr/bin/env node
/**
 * Test script cho activity-scraper skill sử dụng Playwright MCP
 * Chạy full workflow scrape activity từ URL
 */

import { chromium } from 'playwright';
import { scrapeActivityFromText } from './.agents/skills/activity-scraper/scripts/activityScraper.mjs';

const url = process.argv[2] || 'https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619';

console.log('🚀 Bắt đầu scrape activity với Playwright...');
console.log('🔗 URL:', url);
console.log('');

const startTime = Date.now();
let browser;

try {
  // Launch browser
  console.log('🌐 Launching browser...');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  // Navigate to page
  console.log('📄 Loading page...');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  
  // Accept cookies if present
  console.log('🍪 Handling cookies...');
  try {
    const cookieButton = await page.$('text=Đồng ý');
    if (cookieButton) await cookieButton.click();
  } catch (e) {}
  
  // Scroll to load lazy content
  console.log('📜 Scrolling to load content...');
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(2000);
  
  // Click expandable sections
  console.log('🔍 Expanding sections...');
  try {
    const xemTatCa = await page.$('text=Xem tất cả');
    if (xemTatCa) await xemTatCa.click();
    await page.waitForTimeout(2000);
  } catch (e) {}
  
  // Extract page text
  console.log('📝 Extracting page content...');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const pageTitle = await page.title();
  const pageUrl = page.url();
  
  console.log(`✅ Page loaded: ${pageTitle}`);
  console.log(`📊 Content length: ${bodyText.length} characters`);
  console.log('');
  
  // Close browser
  await browser.close();
  browser = null;
  
  // Scrape activity from text
  console.log('🔧 Processing with activity scraper...\n');
  const result = await scrapeActivityFromText(bodyText, pageUrl);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Scrape hoàn tất sau ${duration}s\n`);
  
  if (result.success) {
    console.log('📊 KẾT QUẢ SCRAPE:');
    console.log('==================\n');
    
    const data = result.data;
    
    // Basic info
    console.log('📝 Tiêu đề:', data.title || 'N/A');
    console.log('🏷️  Slug:', data.slug || 'N/A');
    console.log('⏱️  Thởi lượng:', data.duration || 'N/A');
    console.log('📍 Địa điểm:', data.location || 'N/A');
    console.log('📍 Địa chỉ chi tiết:', data.locationDetail || 'N/A');
    console.log('');
    
    // Pricing
    if (data.pricing) {
      console.log('💰 THÔNG TIN GIÁ:');
      if (data.pricing.basePrice) console.log('   - Giá ngưới lớn:', data.pricing.basePrice.toLocaleString('vi-VN'), 'VND');
      if (data.pricing.childPrice) console.log('   - Giá trẻ em:', data.pricing.childPrice.toLocaleString('vi-VN'), 'VND');
      if (data.pricing.currency) console.log('   - Loại tiền:', data.pricing.currency);
      
      if (data.pricing.tiers && data.pricing.tiers.length > 0) {
        console.log(`   - Số gói giá: ${data.pricing.tiers.length}`);
        data.pricing.tiers.forEach((tier, idx) => {
          console.log(`     ${idx + 1}. ${tier.name}: ${tier.basePrice?.toLocaleString('vi-VN')} VND`);
          if (tier.childPrice) console.log(`        → Giá trẻ em: ${tier.childPrice?.toLocaleString('vi-VN')} VND`);
        });
      }
      console.log('');
    }
    
    // Gallery
    if (data.gallery && data.gallery.length > 0) {
      console.log(`🖼️  Số ảnh gallery: ${data.gallery.length}`);
      console.log('   - Featured:', data.featuredImage ? 'Có' : 'Không');
      data.gallery.slice(0, 3).forEach((img, i) => console.log(`   ${i + 1}. ${img.substring(0, 80)}...`));
      if (data.gallery.length > 3) console.log(`   ... và ${data.gallery.length - 3} ảnh khác`);
      console.log('');
    }
    
    // Highlights
    if (data.highlights && data.highlights.length > 0) {
      console.log(`⭐ Điểm nổi bật (${data.highlights.length}):`);
      data.highlights.slice(0, 5).forEach((h, i) => console.log(`   ${i + 1}. ${h.substring(0, 100)}${h.length > 100 ? '...' : ''}`));
      console.log('');
    }
    
    // Description
    if (data.description) {
      console.log('📝 Mô tả:', data.description.substring(0, 200));
      console.log('');
    }
    
    // Included/Excluded
    if (data.included && data.included.length > 0) {
      console.log(`✅ Bao gồm (${data.included.length} items):`);
      data.included.slice(0, 3).forEach(item => console.log(`   - ${item}`));
      if (data.included.length > 3) console.log(`   ... và ${data.included.length - 3} items khác`);
    }
    if (data.excluded && data.excluded.length > 0) {
      console.log(`❌ Không bao gồm (${data.excluded.length} items):`);
      data.excluded.slice(0, 3).forEach(item => console.log(`   - ${item}`));
      if (data.excluded.length > 3) console.log(`   ... và ${data.excluded.length - 3} items khác`);
    }
    console.log('');
    
    // FAQ
    if (data.faq && data.faq.length > 0) {
      console.log(`❓ FAQ (${data.faq.length}):`);
      data.faq.slice(0, 3).forEach((f, i) => {
        console.log(`   Q${i + 1}: ${f.question?.substring(0, 80)}...`);
        console.log(`   A${i + 1}: ${f.answer?.substring(0, 80)}...`);
        console.log('');
      });
    }
    
    // Reviews
    if (data.reviews && Object.keys(data.reviews).length > 0) {
      const reviewCount = Object.keys(data.reviews).length;
      console.log(`⭐ Reviews: ${reviewCount} đánh giá`);
    }
    
    // Rating
    if (data.ratingAverage) {
      console.log(`⭐ Điểm đánh giá: ${data.ratingAverage}/10 (${data.ratingCount || 0} lượt)`);
    }
    
    // Status
    console.log(`\n📊 Trạng thái: ${data.status || 'active'}`);
    console.log(`🔖 Tags: ${data.tags?.join(', ') || 'N/A'}`);
    
    // Full data summary
    console.log('\n📁 File temp:', result.tempFile);
    console.log('\n📊 Tổng số fields:', Object.keys(data).length);
    
  } else {
    console.error('❌ Scrape thất bại:', result.error);
    console.log('\n⏱️ Timeline:');
    result.timeline?.forEach(t => {
      console.log(`   [${t.phase}] ${t.status}: ${t.detail}`);
    });
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  console.error(error.stack);
  if (browser) await browser.close();
  process.exit(1);
}
