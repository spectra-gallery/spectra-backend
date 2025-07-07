# The Function

## Abstract

The Function is a cutting-edge gallery and marketplace on Bitcoin, focused on Generative Art hosted entirely On-Chain. It leverages a comprehensive Content Management System (CMS) and the latest technological innovations in the Bitcoin ecosystem to offer a secure, immersive space for releasing collections, collecting art, and engaging within a vibrant community. The platform's unique approach to digital art, combined with its robust security and user-centric features, makes it a standout in the blockchain art world.

## In a Few Words

- Handles royalties for creators.
- Utilizes smart contracts on Bitcoin for safe transactions through Partially Signed Bitcoin Transactions (PSBTs).
- Offers a curated, online application experience.
- Designed and built by artists, for artists and collectors.

## Structure

The Function is comprised of three core components: Front-End, Back-End, and a Full Bitcoin Node, each functioning as standalone applications yet seamlessly integrated.

### Front-End

- Developed as a Nuxt.js Server Side Rendering application, powered by Vue.js.
- Features a modular component design for scalability and adaptability.

### Back-End

- Built on an Express.js API, leveraging non-blocking JavaScript server-side technology for efficient performance.

### Full Bitcoin Node

- A Bitcoin Core node that interacts with the Blockchain and Ordinals, utilizing the Ord.io module for enhanced functionality.

## Functionalities

- User registration and profile management.
- Minting and inscribing tokens from collections.
- Buying, selling, and bidding for Ordinals.
- Seamless wallet interactions for transactions.
- Commenting and interacting with creators.

## Back-End Functions

- Robust authentication using Bitcoin wallet security.
- Role-based permissions for users, admins, creators, and collectors.
- Comprehensive content management system.
- Detailed user management features.
- File upload and management capabilities.
- Direct interface with the Bitcoin node.
- Automated transaction processing.
- PSBT for secure, multiparty transactions.
- Integration with third-party services.
- Payment and royalty management.
- Email confirmation and communication.
- Discord integration for community engagement.
- Token management for trading activities.

### Security and Authentication

- Authentication process involves connecting a wallet, verifying registration status, and utilizing public key for secure transactions.
- JWT token generation for secure access to platform features.

### Role-Based Permissions

- Diverse user roles with specific functionalities and permissions for a tailored experience.

### Content Management

- Tools for creating, managing, and interacting with collections and artworks.

### User Management

- Comprehensive user profile management, including role requests and collection management.

### Bitcoin Node Interface

- Facilitates ordinals inscription, transaction broadcasting, and provides statistical data.

### Automatic Transactions

- Ensures secure and efficient processing of artist payments, royalties, and API transactions.

### Partially Signed Transactions (PSBT)

- Allows secure, offline, and multiparty signing for trading ordinals, enhancing transaction security.

### Discord Interface

- Real-time updates and notifications through the platform's Discord server.

## Technologies

- Database management through MongoDB.
- Core backend technology stack includes Express.js, Axios, bcryptjs, and Bitcoinjs-lib.
- Front-end technologies involve Nuxt.js, Axios, Bootstrap, and various wallet interfaces (Xverse, Leather, Unisat).
- Additional technologies for file upload, image processing, email services, security, and more, including Multer, Node html-to-image, Nodemailer, Puppeteer, Helmet, JSDOM, JWT, and Cors.