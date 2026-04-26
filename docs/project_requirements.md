# 9Trip B2C - Tài liệu Yêu cầu Dự án (Project Requirements)

> **Phiên bản:** 1.0.0  
> **Ngày tạo:** 27/04/2026  
> **Dựa trên phân tích:** WordPress Theme "Traveler" by ShineTheme (v3.1.3)  
> **Target Stack:** Next.js 16 (App Router) + React 19 + Firebase Web SDK v9+ + Tailwind CSS

---

## Mục lục

1. [Tổng quan Hệ thống](#1-tổng-quan-hệ-thống)
2. [Data Model - Firebase Schema](#2-data-model---firebase-schema)
3. [UI/UX Flow - Cấu trúc Component](#3-uiux-flow---cấu-trúc-component)
4. [Tính năng chi tiết](#4-tính-năng-chi-tiết)
5. [Luồng Booking & Thanh toán](#5-luồng-booking--thanh-toán)
6. [Cấu trúc Trang & URL Map](#6-cấu-trúc-trang--url-map)
7. [Yêu cầu kỹ thuật Next.js/React](#7-yêu-cầu-kỹ-thuật-nextjsreact)

---

## 1. Tổng quan Hệ thống

### 1.1. Mô tả

9Trip B2C là nền tảng đặt Tour du lịch & Khách sạn trực tuyến, sử dụng kiến trúc **Headless CMS** — toàn bộ dữ liệu được quản lý tập trung bởi ERP nội bộ, web chỉ đảm nhiệm lớp giao diện hiển thị và đặt vé cho khách hàng cuối.

- **Khách hàng (Customer):** Tìm kiếm, xem chi tiết, đặt Tour/Khách sạn/Activity/Xe, thanh toán online. Đây là role duy nhất trên web.

### 1.2. Các dịch vụ chính (Post Types trong WP)

| Dịch vụ    | Post Type WP  | Mô tả                                            |
| ---------- | ------------- | ------------------------------------------------ |
| Tour       | `st_tours`    | Tour du lịch (có lịch khởi hành, giá theo người) |
| Hotel      | `st_hotel`    | Khách sạn                                        |
| Hotel Room | `hotel_room`  | Phòng khách sạn (thuộc 1 hotel)                  |
| Activity   | `st_activity` | Hoạt động trải nghiệm                            |
| Car        | `st_cars`     | Thuê xe                                          |
| Rental     | `st_rental`   | Cho thuê nhà/căn hộ                              |
| Flight     | `st_flight`   | Vé máy bay (tích hợp TravelPayouts API)          |

### 1.3. Taxonomy (Danh mục phân loại)

| Taxonomy       | Áp dụng cho             | Ví dụ                         |
| -------------- | ----------------------- | ----------------------------- |
| `st_tour_type` | Tour                    | Adventure, Cultural, Beach... |
| Location       | Tất cả dịch vụ          | Đà Nẵng, Hà Nội, Phú Quốc...  |
| Taxonomy chung | Hotel, Activity, Car... | Facilities, Categories...     |

---

## 2. Data Model - Firebase Schema

### 2.1. Firestore Collections

#### `tours` (Tour du lịch) — COLLECTION READ-ONLY

> ⚠️ **Read-only:** Dữ liệu được đồng bộ một chiều từ ERP nội bộ. Web không thực hiện CRUD trên collection này.

```js
/**
 * @typedef {Object} Tour
 * @property {string} id - Document ID (auto-generated)
 * @property {string} erpTourId - ID gốc từ ERP (dùng để đồng bộ dữ liệu)
 * @property {string} title - Tên tour
 * @property {string} slug - URL slug
 * @property {string} description - Mô tả chi tiết (HTML)
 * @property {string} excerpt - Mô tả ngắn
 * @property {string} locationId - Reference đến Location doc
 * @property {string} tourTypeId - Reference đến taxonomy st_tour_type
 * @property {string[]} gallery - Array các image URLs
 * @property {string} featuredImage - Ảnh đại diện URL
 * @property {string} videoUrl - Video giới thiệu (YouTube/Vimeo)
 * @property {Object} pricing
 * @property {number} pricing.adultPrice - Giá người lớn
 * @property {number} pricing.childPrice - Giá trẻ em
 * @property {number} pricing.infantPrice - Giá em bé
 * @property {string} pricing.currency - Mã tiền tệ (VND, USD)
 * @property {number} pricing.discount - % giảm giá
 * @property {string} pricing.discountType - 'percent' | 'fixed'
 * @property {Object} duration
 * @property {number} duration.days - Số ngày
 * @property {number} duration.nights - Số đêm
 * @property {string} duration.unit - 'day' | 'hour'
 * @property {number} maxPeople - Số người tối đa
 * @property {number} minPeople - Số người tối thiểu
 * @property {Object} availability
 * @property {string} availability.type - 'always' | 'specific' | 'date_range'
 * @property {Timestamp[]} availability.startDates - Các ngày khởi hành
 * @property {Object} itinerary - Lịch trình (array of day objects)
 * @property {Object[]} faq - FAQ items [{question, answer}]
 * @property {Object} map
 * @property {number} map.lat - Latitude
 * @property {number} map.lng - Longitude
 * @property {number} map.zoom - Zoom level
 * @property {string[]} included - Bao gồm
 * @property {string[]} excluded - Không bao gồm
 * @property {string[]} highlights - Điểm nổi bật
 * @property {Object} externalBooking - Đặt qua bên thứ 3
 * @property {string} externalBooking.url
 * @property {boolean} externalBooking.enabled
 * @property {number} ratingAverage - Điểm đánh giá trung bình
 * @property {number} ratingCount - Số lượt đánh giá
 * @property {number} viewCount - Số lượt xem
 * @property {boolean} isFeatured - Nổi bật
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */
```

#### `hotels` — COLLECTION READ-ONLY

> ⚠️ **Read-only:** Dữ liệu được đồng bộ một chiều từ ERP nội bộ. Web không thực hiện CRUD trên collection này.

```js
/**
 * @typedef {Object} Hotel
 * @property {string} id
 * @property {string} erpTourId - ID gốc từ ERP (dùng để đồng bộ dữ liệu)
 * @property {string} title
 * @property {string} slug
 * @property {string} description
 * @property {string} locationId
 * @property {string[]} gallery
 * @property {string} featuredImage
 * @property {Object} map - {lat, lng, zoom}
 * @property {string} address - Địa chỉ
 * @property {string} email
 * @property {string} phone
 * @property {string} website
 * @property {number} starRating - 1-5 sao
 * @property {string} hotelType - 'hotel' | 'resort' | 'villa' | 'homestay'
 * @property {string[]} facilities - Tiện ích
 * @property {Object} checkInOut
 * @property {string} checkInOut.checkIn - Giờ check-in (HH:mm)
 * @property {string} checkInOut.checkOut - Giờ check-out
 * @property {boolean} isFeatured
 * @property {number} ratingAverage
 * @property {number} ratingCount
 * @property {number} minPrice - Giá phòng thấp nhất (tính từ rooms)
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */
```

#### `rooms` (Hotel Room) — COLLECTION READ-ONLY

> ⚠️ **Read-only:** Dữ liệu được đồng bộ một chiều từ ERP nội bộ.

```js
/**
 * @typedef {Object} Room
 * @property {string} id
 * @property {string} title
 * @property {string} hotelId - Reference đến Hotel
 * @property {string[]} gallery
 * @property {number} price - Giá cơ bản/đêm
 * @property {Object} pricing
 * @property {number} pricing.adultPrice
 * @property {number} pricing.childPrice
 * @property {number} numberRoom - Số phòng available
 * @property {number} maxAdults - Số người lớn tối đa
 * @property {number} maxChildren - Số trẻ em tối đa
 * @property {number} roomSize - Diện tích (m²)
 * @property {string} bedType - Loại giường
 * @property {string[]} amenities - Tiện nghi phòng
 * @property {string} status
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */
```

#### `activities` — COLLECTION READ-ONLY

> ⚠️ **Read-only:** Dữ liệu được đồng bộ một chiều từ ERP nội bộ.

```js
/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} description
 * @property {string} locationId
 * @property {string[]} gallery
 * @property {string} featuredImage
 * @property {Object} pricing - {adultPrice, childPrice, infantPrice, discount}
 * @property {Object} duration - {hours, minutes}
 * @property {number} maxPeople
 * @property {Object} map - {lat, lng, zoom}
 * @property {string} activityType - Phân loại activity
 * @property {string[]} included
 * @property {string[]} excluded
 * @property {Object} availability - {type, startDates[]}
 * @property {boolean} externalBooking - {enabled, url}
 * @property {string} status
 * @property {number} ratingAverage
 * @property {number} ratingCount
 * @property {boolean} isFeatured
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */
```

#### `cars` — COLLECTION READ-ONLY

> ⚠️ **Read-only:** Dữ liệu được đồng bộ một chiều từ ERP nội bộ.

```js
/**
 * @typedef {Object} Car
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} description
 * @property {string} locationId - Địa điểm đón
 * @property {string[]} gallery
 * @property {string} featuredImage
 * @property {Object} pricing
 * @property {number} pricing.price - Giá theo đơn vị
 * @property {string} pricing.unit - 'hour' | 'day' | 'km'
 * @property {number} pricing.numberUnit - Số đơn vị tối thiểu
 * @property {number} pricing.discount
 * @property {number} maxPassenger - Số hành khách tối đa
 * @property {number} doors - Số cửa
 * @property {string} transmission - 'automatic' | 'manual'
 * @property {string[]} features
 * @property {string} status
 * @property {number} ratingAverage
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 */
```

#### `locations`

```js
/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} name - VD: "Đà Nẵng"
 * @property {string} slug
 * @property {string} description
 * @property {string} featuredImage
 * @property {Object} map - {lat, lng, zoom}
 * @property {string} parentId - Location cha (nếu có)
 * @property {string} country
 * @property {string} type - 'city' | 'region' | 'country'
 * @property {boolean} isFeatured
 * @property {Timestamp} createdAt
 */
```

#### `bookings`

```js
/**
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} bookingCode - Mã booking (hiển thị cho KH)
 * @property {string} userId - Người đặt
 * @property {string} userEmail
 * @property {string} userPhone
 * @property {string} userFirstName
 * @property {string} userLastName
 * @property {string} userAddress
 * @property {string} userNotes - Ghi chú từ khách
 * @property {string} serviceType - 'tour' | 'hotel_room' | 'activity' | 'car' | 'rental'
 * @property {string} serviceId - Reference đến service document
 * @property {string} serviceTitle - Tên service (snapshot để tra cứu nhanh)
 * @property {Object} bookingDetails - Chi tiết đặt
 * @property {Timestamp} bookingDetails.checkIn - Ngày check-in (hotel)
 * @property {Timestamp} bookingDetails.checkOut - Ngày check-out (hotel)
 * @property {Timestamp} bookingDetails.startDate - Ngày khởi hành (tour/activity/car)
 * @property {Timestamp} bookingDetails.endDate - Ngày kết thúc
 * @property {Object} bookingDetails.time - {pickUp, dropOff} cho car
 * @property {Object} guestInfo - Thông tin khách đi
 * @property {number} guestInfo.adults
 * @property {number} guestInfo.children
 * @property {number} guestInfo.infants
 * @property {Object} pricing
 * @property {number} pricing.basePrice - Giá gốc
 * @property {number} pricing.discount - Tiền giảm
 * @property {number} pricing.tax - Thuế
 * @property {number} pricing.total - Tổng thanh toán
 * @property {string} pricing.currency
 * @property {string} couponCode - Mã giảm giá (nếu có)
 * @property {string} paymentMethod - 'stripe' | 'paypal' | 'cash' | 'vnpay'
 * @property {string} paymentGateway - Cổng thanh toán đã chọn ('stripe' | 'paypal' | 'vnpay' | 'momo' | 'cash')
 * @property {string} transactionId - Mã giao dịch từ cổng thanh toán
 * @property {string} paymentStatus - 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
 * @property {string} bookingStatus - 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refund_requested'
 * @property {string} erpSyncStatus - Trạng thái đồng bộ với ERP ('pending' | 'synced' | 'failed')
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 * @property {string} ipAddress
 * @property {string} userAgent
 */
```

#### `reviews`

```js
/**
 * @typedef {Object} Review
 * @property {string} id
 * @property {string} userId
 * @property {string} userName
 * @property {string} userAvatar
 * @property {string} serviceType - 'tour' | 'hotel' | 'activity' | 'car'
 * @property {string} serviceId
 * @property {string} bookingId - Reference đến booking
 * @property {number} rating - 1-5
 * @property {string} title
 * @property {string} content
 * @property {string[]} images
 * @property {string} status - 'approved' | 'pending'
 * @property {Timestamp} createdAt
 */
```

#### `users` (Firestore profiles - mở rộng Firebase Auth)

> **Chỉ có 1 role duy nhất: `customer`.** Không có Partner hay Admin trên web này.

```js
/**
 * @typedef {Object} UserProfile
 * @property {string} uid - Firebase Auth UID
 * @property {string} email
 * @property {string} displayName
 * @property {string} phone
 * @property {string} avatar
 * @property {string} address
 * @property {string[]} wishlist - Array service IDs
 * @property {Timestamp} createdAt
 */
```

#### `coupons`

```js
/**
 * @typedef {Object} Coupon
 * @property {string} id
 * @property {string} code - Mã code
 * @property {string} type - 'percent' | 'fixed'
 * @property {number} amount - Giá trị giảm
 * @property {number} minSpend - Đơn tối thiểu
 * @property {number} maxUsage - Số lần dùng tối đa
 * @property {number} usedCount - Đã dùng
 * @property {Timestamp} expireDate
 * @property {string[]} applicableServices - 'all' hoặc array service types
 * @property {string} status - 'active' | 'inactive'
 */
```

#### `notifications`

```js
/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} userId
 * @property {string} type - 'booking' | 'message' | 'system' | 'promo'
 * @property {string} title
 * @property {string} body
 * @property {string} link
 * @property {boolean} isRead
 * @property {Timestamp} createdAt
 */
```

#### `settings`

```js
/**
 * @typedef {Object} SiteSettings
 * @property {string} siteName
 * @property {string} siteDescription
 * @property {string} logoUrl
 * @property {string} faviconUrl
 * @property {string} primaryColor - Hex color
 * @property {Object} contact - {email, phone, address, socialLinks}
 * @property {Object} booking - {minAdvanceBooking, maxAdvanceBooking, cancellationPolicy}
 * @property {Object} payment - {enabledGateways, currency, taxPercentage}
 * @property {Object} email - {smtpConfig, templates}
 * @property {Object} seo - {metaTitle, metaDescription, googleAnalyticsId}
 */
```

### 2.2. Firebase Storage Structure

```
/storage/
  /gallery/
    /tours/{tourId}/
    /hotels/{hotelId}/
    /rooms/{roomId}/
    /activities/{activityId}/
    /cars/{carId}/
  /avatars/{userId}/
  /reviews/{reviewId}/
  /settings/
```

---

## 3. UI/UX Flow - Cấu trúc Component

### 3.1. Trang Chủ (Home Page)

**Template WP:** `template-home-modern.php`, `template-home.php`

```
HomePage
├── Header (Global)
│   ├── TopBar
│   │   ├── LanguageSwitcher
│   │   ├── CurrencySwitcher
│   │   ├── LoginButton / UserMenu
│   │   └── ContactPhone
│   └── NavigationMenu
│       ├── Logo
│       ├── SearchButton (popup)
│       ├── MegaMenu (Tour, Hotel, Activity, Car...)
│       └── MiniCart
├── HeroBanner
│   ├── SearchTabsModern
│   │   ├── TourSearchTab (Destination, Date, Guests)
│   │   ├── HotelSearchTab (Destination, CheckIn, CheckOut, Guests)
│   │   ├── ActivitySearchTab
│   │   └── CarSearchTab
│   └── BackgroundSlider / Video
├── FeaturedDestinations
│   └── LocationCard[] (image, name, tourCount)
├── FeaturedTours / TourListCarousel
│   └── TourCard[] (image, title, price, rating, duration, badge)
├── TopHotels / HotelListGrid
│   └── HotelCard[] (image, title, starRating, minPrice)
├── BestActivities / ActivityListGrid
│   └── ActivityCard[]
├── WhyChooseUs / TrustBadges
├── Testimonials / ReviewsCarousel
├── BlogPosts / LatestNews
└── Footer (Global)
    ├── FooterWidgets (Company Info, Quick Links, Contact)
    ├── SocialLinks
    └── Copyright
```

### 3.2. Trang Tìm kiếm & Danh sách Tour (Tour Listing)

**Template WP:** `search-tour.php`, `template-tour-search.php`

```
TourSearchPage
├── Breadcrumb
├── PageTitle ("Tìm Tour Du Lịch")
├── SearchFormPopup (Change Search)
├── Layout: Row
│   ├── Sidebar (Filter)
│   │   ├── FilterByPrice (Range Slider)
│   │   ├── FilterByRating
│   │   ├── FilterByTourType (Checkbox list)
│   │   ├── FilterByDuration
│   │   └── FilterByLocation
│   └── MainContent
│       ├── ResultHeader (count & sort)
│       │   ├── ResultCount ("Hiển thị X trong tổng Y tour")
│       │   ├── SortDropdown (Giá thấp/cao, Rating, Mới nhất)
│       │   └── ViewToggle (Grid/List)
│       ├── TourList (Grid hoặc List)
│       │   └── TourCard[] / TourListItem[]
│       ├── NoResultsPlaceholder
│       └── Pagination
```

### 3.3. Trang Chi tiết Tour (Single Tour)

**Template WP:** `single-st_tours.php`, `template-single-tour-modern.php`

```
TourDetailPage
├── Breadcrumb
├── TourHeader
│   ├── GallerySlider / FeaturedImage
│   ├── Title & Rating
│   ├── Location (icon + map link)
│   ├── Duration & Badges
│   └── PriceDisplay (từ X VND, discount badge)
├── Layout: Row
│   ├── MainColumn (2/3)
│   │   ├── TabNavigation
│   │   │   ├── Tab: Tổng quan (Overview)
│   │   │   ├── Tab: Lịch trình (Itinerary)
│   │   │   ├── Tab: Chi tiết (Details/Included/Excluded)
│   │   │   ├── Tab: Bản đồ (Map)
│   │   │   ├── Tab: Đánh giá (Reviews)
│   │   │   └── Tab: FAQ
│   │   ├── TabContent
│   │   │   ├── OverviewPanel
│   │   │   │   ├── Description (rich HTML)
│   │   │   │   ├── Highlights
│   │   │   │   └── TourProgram / Timeline
│   │   │   ├── ItineraryPanel
│   │   │   │   └── DayByDay[] (expandable)
│   │   │   ├── MapPanel
│   │   │   │   └── GoogleMap / Mapbox (marker)
│   │   │   ├── ReviewsPanel
│   │   │   │   ├── RatingSummary (average, distribution bar)
│   │   │   │   ├── ReviewList[]
│   │   │   │   └── LoadMoreReview
│   │   │   └── FAQPanel
│   │   │       └── Accordion[]
│   │   └── RelatedTours (Carousel)
│   └── SidebarColumn (1/3) - BookingForm (sticky)
│       ├── PriceSummary
│       │   ├── FromPrice
│       │   └── PerPerson Label
│       ├── BookingForm
│       │   ├── DatePicker (chọn ngày khởi hành)
│       │   ├── GuestSelector
│       │   │   ├── AdultCount ( +/- )
│       │   │   ├── ChildCount ( +/- )
│       │   │   └── InfantCount ( +/- )
│       │   ├── PriceCalculator (real-time)
│       │   │   ├── BasePrice
│       │   │   ├── Discount
│       │   │   ├── Tax
│       │   │   └── TotalPrice
│       │   ├── CheckAvailability Button
│       │   └── BookNow Button → Redirect checkout
│       └── ContactBox
│           ├── Phone
│           └── Email
```

### 3.4. Trang Chi tiết Khách sạn (Single Hotel)

**Template WP:** `single-st_hotel.php`

```
HotelDetailPage
├── Breadcrumb
├── HotelHeader
│   ├── GallerySlider
│   ├── Title & StarRating
│   ├── Location + MapIcon
│   └── PriceFrom
├── Layout: Row
│   ├── MainColumn
│   │   ├── TabNavigation
│   │   │   ├── Tab: Tổng quan
│   │   │   ├── Tab: Phòng (Rooms)
│   │   │   ├── Tab: Tiện nghi (Facilities)
│   │   │   ├── Tab: Bản đồ (Map)
│   │   │   └── Tab: Đánh giá (Reviews)
│   │   └── TabContent
│   │       ├── OverviewPanel (description, amenities)
│   │       ├── RoomList
│   │       │   └── RoomCard[] (image, name, price, guests, amenities, BookNow button)
│   │       ├── FacilitiesGrid (icon list)
│   │       ├── MapPanel
│   │       └── ReviewsPanel
│   └── SidebarColumn - CheckAvailabilityForm
│       ├── DateRangePicker (CheckIn / CheckOut)
│       ├── GuestSelector (Adults, Children)
│       ├── CheckAvailability Button
│       └── AvailableRoomList (hiện sau khi check)
```

### 3.5. Trang Chi tiết Phòng (Single Hotel Room)

**Template WP:** `single-hotel_room.php`

```
RoomDetailPage
├── Gallery / FeaturedImage
├── RoomHeader
│   ├── Title
│   ├── HotelName (link)
│   └── PricePerNight
├── TabNavigation
│   ├── Tab: Photos
│   ├── Tab: Description
│   ├── Tab: Amenities
│   └── Tab: Reviews
├── TabContent
└── Sidebar - BookingForm
    ├── DateRangePicker
    ├── GuestCount
    ├── NumberOfRooms
    ├── PriceSummary
    └── BookNow Button
```

### 3.6. Trang Chi tiết Activity

**Template WP:** `single-st_activity.php`

```
ActivityDetailPage
├── Breadcrumb
├── ActivityHeader
│   ├── Gallery
│   ├── Title & Rating
│   ├── Duration & Location
│   └── PriceFrom
├── Layout: Row
│   ├── MainColumn
│   │   ├── Tab: Tổng quan
│   │   ├── Tab: Map
│   │   └── Tab: Reviews
│   └── Sidebar - BookingForm
│       ├── DatePicker
│       ├── GuestSelector
│       ├── PriceSummary
│       └── BookNow
```

### 3.7. Trang Thanh Toán (Checkout)

**Template WP:** `template-checkout.php`

```
CheckoutPage
├── Breadcrumb
├── PageTitle ("Thanh toán")
├── EmptyCartAlert (nếu giỏ trống)
├── Layout: Row
│   ├── MainColumn (2/3)
│   │   ├── Section: Booking Submission
│   │   │   ├── CustomerInfoForm
│   │   │   │   ├── FirstName
│   │   │   │   ├── LastName
│   │   │   │   ├── Email
│   │   │   │   ├── Phone
│   │   │   │   ├── Address
│   │   │   │   ├── SpecialRequirements (textarea)
│   │   │   │   └── GuestInfo (nếu khác người đặt)
│   │   │   └── PaymentMethodSelector
│   │   │       ├── StripeOption
│   │   │       ├── PayPalOption
│   │   │       ├── VNPayOption (local)
│   │   │       ├── CashOption (thanh toán sau)
│   │   │       └── CouponInput (optional)
│   │   └── CheckoutFormFooter
│   │       ├── TermsCheckbox
│   │       ├── SubmitButton ("Xác nhận & Thanh toán")
│   │       └── CancelLink
│   └── SidebarColumn (1/3) - CartSummary
│       ├── YourBookingTitle
│       ├── CartItem[]
│       │   ├── ServiceImage
│       │   ├── ServiceTitle
│       │   ├── ServiceType badge
│       │   ├── BookingDetail (dates, guests)
│       │   └── Price
│       ├── Divider
│       └── OrderSummary
│           ├── Subtotal
│           ├── Discount (if coupon)
│           ├── Tax
│           └── TotalAmount (highlighted)
```

### 3.8. Trang Xác nhận Đặt hàng (Confirmation)

**Template WP:** `template-confirm.php`

```
ConfirmPage
├── StatusIcon (Success ✓ / Error ✗)
├── StatusMessage
│   ├── Title ("Đặt tour thành công!")
│   └── Subtitle ("Mã booking đã gửi đến email...")
├── BookingDetails
│   ├── BookingNumber
│   ├── BookingDate
│   ├── PaymentMethod
│   ├── Status
│   └── CustomerInfo
├── ServiceSummary
│   └── ServiceCard (tên, ảnh, ngày, số khách, giá)
└── ActionButtons
    ├── ViewBooking
    └── BackToHome
```

### 3.9. Trang User Dashboard (Chỉ dành cho Customer)

**Template WP:** `template-user.php`

```
UserDashboardPage
├── Sidebar (semi-collapsible)
│   ├── Logo
│   ├── UserInfo (avatar, name, member since)
│   └── MenuItems[]
│       ├── Settings
│       ├── BookingHistory
│       ├── Wishlist
│       └── Inbox
├── MainContent
│   └── (dynamic content based on active tab)
└── Footer
```

### 3.10. Component chung (Shared Components)

```
Global Components
├── Header (multiple variants: default, full, transparent, hotel-activity)
├── Footer (multiple variants: default, hotel-alone, member)
├── Breadcrumb
├── SearchForm (popup modal)
├── MiniCart (dropdown)
├── LanguageSwitcher
├── CurrencySwitcher
├── LoginModal / RegisterModal
├── ProfileAvatar
├── TourCard (grid & list variants)
├── HotelCard
├── ActivityCard
├── RoomCard
├── StarRatingDisplay
├── PriceDisplay (with discount badge)
├── GallerySlider
├── ImageLightbox
├── GoogleMap / Mapbox
├── DatePicker (custom, kết nối availability)
├── GuestSelector (+/- counter)
├── PriceCalculator
├── FilterSidebar
├── SortDropdown
├── Pagination
├── EmptyState
├── LoadingSpinner
├── ErrorBoundary
└── Toast / Notification
```

---

## 4. Tính năng chi tiết

### 4.1. Hệ thống Tìm kiếm & Lọc

| Tính năng               | Mô tả                                                 | Độ ưu tiên |
| ----------------------- | ----------------------------------------------------- | ---------- |
| Search theo Destination | Gõ tên địa điểm, autocomplete từ locations collection | P0         |
| Search theo ngày        | Date Picker chọn ngày khởi hành / check-in            | P0         |
| Search theo số khách    | Adult/Child/Infant counter                            | P0         |
| Filter theo giá         | Range slider (min-max price)                          | P0         |
| Filter theo Rating      | Checkbox 1-5 sao                                      | P1         |
| Filter theo Tour Type   | Taxonomy checkbox list                                | P1         |
| Filter theo Duration    | Khoảng thời gian                                      | P2         |
| Sắp xếp kết quả         | Giá, Rating, Mới nhất, Phổ biến                       | P0         |
| View toggle Grid/List   | Chuyển đổi layout hiển thị                            | P2         |
| Ajax loading            | Load kết quả không reload trang                       | P0         |
| Bản đồ search           | Map view hiển thị vị trí kết quả                      | P2         |
| Search All Post Type    | Tìm kiếm toàn bộ dịch vụ                              | P2         |

### 4.2. Hệ thống Booking

| Tính năng             | Mô tả                                                               | Độ ưu tiên |
| --------------------- | ------------------------------------------------------------------- | ---------- |
| Availability Check    | Kiểm tra phòng trống / tour còn chỗ (tính cả inventory_holds)       | P0         |
| Inventory Hold        | Khóa chỗ tạm thời 10 phút khi khách vào checkout, chống overbooking | P0         |
| Real-time Price Calc  | Tính giá theo ngày, số khách, discount                              | P0         |
| Multiple guest types  | Adult, Child, Infant với giá khác nhau                              | P0         |
| Date Range Selection  | Pick Check-in/Check-out hoặc Start Date                             | P0         |
| Booking Form          | Form thông tin khách hàng                                           | P0         |
| Coupon Code           | Áp dụng mã giảm giá                                                 | P1         |
| External Booking      | Redirect sang đối tác ngoài                                         | P2         |
| Cart System           | Thêm vào giỏ, sửa, xóa                                              | P0         |
| Multi-service booking | Đặt nhiều dịch vụ trong 1 đơn                                       | P2         |
| Booking History       | Xem lịch sử đặt hàng                                                | P0         |
| Booking Cancellation  | Hủy booking (theo policy)                                           | P1         |

### 4.3. Hệ thống Thanh toán

| Tính năng            | Mô tả                          | Độ ưu tiên |
| -------------------- | ------------------------------ | ---------- |
| Stripe               | Thanh toán thẻ quốc tế         | P0         |
| PayPal               | Thanh toán PayPal              | P1         |
| VNPay                | Thanh toán nội địa VN          | P0         |
| Momo                 | Thanh toán Ví Điện Tử Momo     | P0         |
| Cash on Delivery     | Thanh toán sau                 | P1         |
| Payment Confirmation | Xác nhận thanh toán thành công | P0         |
| Payment Failed       | Xử lý lỗi thanh toán           | P0         |
| Refund               | Hoàn tiền (manual hoặc auto)   | P2         |
| Payment Email        | Gửi email xác nhận thanh toán  | P1         |

### 4.4. Hệ thống User

| Tính năng          | Mô tả                                             | Độ ưu tiên |
| ------------------ | ------------------------------------------------- | ---------- |
| Register/Login     | Email + Password, Social Login (Google, Facebook) | P0         |
| Profile Management | Cập nhật thông tin cá nhân                        | P0         |
| Wishlist           | Danh sách yêu thích                               | P1         |
| Inbox/Notification | Thông báo booking, message                        | P1         |
| Review System      | Đánh giá sau khi hoàn thành tour                  | P0         |
| Forgot Password    | Reset password qua email                          | P1         |

### 4.5. Hệ thống Review & Rating

| Tính năng            | Mô tả                               | Độ ưu tiên |
| -------------------- | ----------------------------------- | ---------- |
| 5-star Rating        | Đánh giá 1-5 sao                    | P0         |
| Review Text + Images | Viết review kèm ảnh                 | P0         |
| Rating Summary       | Hiển thị điểm trung bình, phân phối | P0         |
| Verified Badge       | Đánh dấu review từ khách đã booking | P1         |
| Review Moderation    | Duyệt review trước khi hiển thị     | P1         |

### 4.6. SEO & Performance

| Tính năng          | Mô tả                                                                                                                                                                                 | Độ ưu tiên |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Meta Tags          | Dynamic title, description cho mỗi trang                                                                                                                                              | P0         |
| Sitemap            | XML sitemap tự động                                                                                                                                                                   | P1         |
| Structured Data    | **JSON-LD Schema.org bắt buộc** cho mọi trang chi tiết (Tour → `TouristTrip`, Hotel → `Hotel`, Activity → `TouristAttraction`), trang tìm kiếm (`ItemList`), tổ chức (`Organization`) | P0         |
| ISR/SSG            | Next.js Incremental Static Regeneration                                                                                                                                               | P0         |
| Image Optimization | Next.js Image component                                                                                                                                                               | P0         |
| Lazy Loading       | Lazy load components & images                                                                                                                                                         | P0         |

> ⚠️ **Bắt buộc:** Tất cả trang chi tiết Tour, Hotel, Activity phải có JSON-LD Schema.org để đảm bảo SEO. Cấu trúc schema được định nghĩa rõ trong từng page component.

---

## 5. Luồng Booking & Thanh toán

### 5.1. Luồng chính

```
[Trang chi tiết Tour] → [Chọn ngày + số khách] → [Tính giá realtime]
→ [Click "Đặt ngay"] → [**Inventory Hold: Khóa chỗ tạm thời 10 phút**]
→ [Checkout Page] → [Điền thông tin KH] → [Chọn phương thức thanh toán]
→ [Nhập coupon (optional)] → [Xác nhận đặt]
→ [Xử lý thanh toán] → [Confirmation Page]
→ [Gửi email xác nhận]
```

> **Cơ chế Inventory Hold:** Mỗi khi khách bắt đầu checkout, hệ thống tạo document trong collection `inventory_holds` với TTL 10 phút. Hệ thống kiểm tra cả `inventory_holds` + `bookings` để tính availability thực tế, chống overbooking. Nếu hết 10 phút chưa thanh toán, Firestore TTL tự động xóa hold, giải phóng chỗ.

### 5.2. State management cho Cart

```js
// CartState (Context hoặc Zustand)
{
  items: [
    {
      serviceId: "tour_123",
      serviceType: "tour",
      serviceTitle: "Tour Đà Nẵng - Hội An",
      featuredImage: "url",
      startDate: Timestamp,
      adults: 2,
      children: 1,
      infants: 0,
      basePrice: 2500000,
      discount: 250000,
      total: 2250000,
      currency: "VND"
    }
  ],
  couponCode: null,
  couponDiscount: 0
}
```

### 5.3. Payment Gateway Integration

- **Stripe:** Sử dụng Stripe Elements + Payment Intents API
- **PayPal:** PayPal JS SDK
- **VNPay:** Redirect sang VNPay, callback xử lý qua webhook `/api/webhooks/payment`
- **Momo:** Redirect sang Momo, callback xử lý qua webhook `/api/webhooks/payment`
- **Cash:** Tạo booking với status "pending_payment"

---

## 6. Cấu trúc Trang & URL Map

| Trang                   | URL Pattern                     | Loại Render      |
| ----------------------- | ------------------------------- | ---------------- |
| Trang chủ               | `/`                             | SSG + ISR        |
| Danh sách Tour          | `/tours`                        | SSR              |
| Danh sách Tour (filter) | `/tours?location=...&price=...` | SSR              |
| Chi tiết Tour           | `/tours/[slug]`                 | ISR (revalidate) |
| Danh sách Hotel         | `/hotels`                       | SSR              |
| Chi tiết Hotel          | `/hotels/[slug]`                | ISR              |
| Chi tiết Room           | `/hotels/[slug]/rooms/[roomId]` | ISR              |
| Danh sách Activity      | `/activities`                   | SSR              |
| Chi tiết Activity       | `/activities/[slug]`            | ISR              |
| Checkout                | `/checkout`                     | CSR (protected)  |
| Xác nhận                | `/booking/confirm`              | SSR              |
| User Dashboard          | `/account/[...tab]`             | CSR (protected)  |
| Login                   | `/login`                        | SSR              |
| Register                | `/register`                     | SSR              |
| Wishlist                | `/wishlist`                     | CSR (protected)  |
| Search all              | `/search?q=...`                 | SSR              |
| Location page           | `/destinations/[slug]`          | ISR              |

---

## 7. Yêu cầu kỹ thuật Next.js/React

### 7.1. Cấu trúc thư mục dự kiến

```
src/
├── app/                         # Next.js App Router
│   ├── layout.js                # Root layout (Header + Footer)
│   ├── page.js                  # Home page
│   ├── tours/
│   │   ├── page.js              # Tour listing
│   │   └── [slug]/
│   │       └── page.js          # Tour detail
│   ├── hotels/
│   │   ├── page.js
│   │   └── [slug]/
│   │       ├── page.js
│   │       └── rooms/
│   │           └── [roomId]/
│   │               └── page.js
│   ├── activities/
│   │   ├── page.js
│   │   └── [slug]/page.js
│   ├── checkout/page.js
│   ├── booking/
│   │   └── confirm/page.js
│   ├── account/
│   │   └── [...tab]/page.js
│   ├── login/page.js
│   ├── register/page.js
│   ├── destinations/[slug]/page.js
│   ├── search/page.js
│   └── api/
│       └── webhooks/
│           └── payment/
│               └── route.js     # Nhận callback từ cổng thanh toán (Stripe, VNPay, Momo)
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── Breadcrumb.jsx
│   ├── home/
│   │   ├── HeroBanner.jsx
│   │   ├── SearchTabs.jsx
│   │   ├── FeaturedTours.jsx
│   │   └── ...
│   ├── tours/
│   │   ├── TourCard.jsx
│   │   ├── TourList.jsx
│   │   ├── TourDetail/
│   │   │   ├── TourHeader.jsx
│   │   │   ├── TourTabs.jsx
│   │   │   ├── BookingSidebar.jsx
│   │   │   ├── ItineraryPanel.jsx
│   │   │   └── ReviewsPanel.jsx
│   │   └── TourFilters.jsx
│   ├── hotels/
│   ├── booking/
│   │   ├── CartSummary.jsx
│   │   ├── CustomerForm.jsx
│   │   ├── PaymentSelector.jsx
│   │   └── CouponInput.jsx
│   ├── shared/
│   │   ├── GalleryWithLightbox.jsx
│   │   ├── DateRangePicker.jsx
│   │   ├── GuestSelector.jsx
│   │   ├── PriceDisplay.jsx
│   │   ├── StarRating.jsx
│   │   ├── GoogleMap.jsx
│   │   ├── Pagination.jsx
│   │   └── LoadingSpinner.jsx
│   └── auth/
│       ├── LoginModal.jsx
│       └── RegisterModal.jsx
├── lib/
│   ├── firebase.js              # Firebase config & init
│   ├── firestore.js             # Firestore CRUD helpers
│   ├── auth.js                  # Auth context & hooks
│   ├── cart.js                  # Cart state management
│   └── utils.js                 # Helpers
├── hooks/
│   ├── useTours.js              # Tour data fetching hook
│   ├── useHotels.js
│   ├── useAuth.js
│   └── useCart.js
└── styles/                      # (Tailwind handles most, extra globals if needed)
    └── globals.css
```

### 7.2. Các React 19 / Next.js 16 Patterns cần áp dụng

- **Server Components:** Mặc định cho tất cả page/layout components
- **Client Components:** Chỉ khi cần interactivity (`'use client'`)
    - SearchForm, BookingSidebar, Filter, Cart, UserProfile
- **Server Actions:** Xử lý form submit (booking, contact)
- **`useOptimistic`:** Update cart/like ngay lập tức
- **`useFormStatus`:** Loading state cho form
- **`useActionState`:** Form validation + state
- **ISR (`revalidate`):** Revalidate trang chi tiết tour/hotel định kỳ
- **Streaming & Suspense:** Loading skeleton cho các section
- **Dynamic Imports:** `next/dynamic` cho map, gallery, heavy components

### 7.3. Firebase Integration Points

- **Firestore:** Tất cả CRUD cho tours, hotels, bookings, reviews, users
- **Firebase Auth:** Login/Register (Email+Password, Google, Facebook)
- **Firebase Storage:** Upload images (gallery, avatar, review images)
- **Firebase Cloud Functions (optional):**
    - Gửi email xác nhận booking (trigger từ Firestore)
    - Tính toán lại rating average
    - Dọn dẹp dữ liệu

### 7.4. SEO Considerations

- Mỗi trang tour/destination cần có `generateMetadata` dynamic
- Sử dụng `generateStaticParams` cho các route phổ biến
- JSON-LD structured data cho Tour, Hotel, Activity
- Sitemap tự động với `/sitemap.xml`

---

> **Tài liệu này là kim chỉ nam cho toàn bộ quá trình phát triển dự án 9Trip B2C.**
> Mọi thay đổi về scope cần được cập nhật vào đây.
