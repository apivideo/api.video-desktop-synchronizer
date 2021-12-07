const path = require('path');
const fs = require('fs');
const packageJson = require('./package.json');

const { version } = packageJson;
const iconDir = path.resolve(__dirname, 'assets', 'icons');

if (process.env['WINDOWS_CODESIGN_FILE']) {
    const certPath = path.join(__dirname, 'win-certificate.pfx');
    const certExists = fs.existsSync(certPath);

    if (certExists) {
        process.env['WINDOWS_CODESIGN_FILE'] = certPath;
    }
}

const commonLinuxConfig = {
    icon: {
        scalable: path.resolve(iconDir, 'fiddle.svg'),
    },
    mimeType: ['x-scheme-handler/electron-fiddle'],
};

const config = {
    /*hooks: {
        generateAssets: require('./tools/generateAssets'),
    },*/
    packagerConfig: {
        name: 'api-video-synchronizer',
        executableName: 'api-video-synchronizer',
        asar: true,
        icon: path.resolve(__dirname, 'src', 'assets', 'api-video-logo'),
        appBundleId: 'video.api.synchronizer',
        appCategoryType: 'public.app-category.video',
        win32metadata: {
            CompanyName: 'api.video',
            OriginalFilename: 'api-video-synchronizer',
        },
        osxSign: {
            identity: 'Developer ID Application: Anthony Dantard (GBC36KP98K)',
            hardenedRuntime: true,
            'gatekeeper-assess': false,
            entitlements: 'entitlements.plist',
            'entitlements-inherit': 'entitlements.plist',
            'signature-flags': 'library',
        },
    },
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            platforms: ['win32'],
            config: (arch) => {
                /* const certificateFile = process.env.CI
                    ? path.join(__dirname, 'cert.p12')
                    : process.env.WINDOWS_CERTIFICATE_FILE;

                if (!certificateFile || !fs.existsSync(certificateFile)) {
                    console.warn(
                        `Warning: Could not find certificate file at ${certificateFile}`,
                    );
                }*/

                return {
                    name: 'api-video-synchronizer',
                    authors: 'api.video',
                    exe: 'api-video-synchronizer.exe',
                    //iconUrl:
                    //    'https://raw.githubusercontent.com/electron/fiddle/0119f0ce697f5ff7dec4fe51f17620c78cfd488b/assets/icons/fiddle.ico',
                    // loadingGif: './assets/loading.gif',
                    //noMsi: true,
                    setupExe: `api-video-synchronizer-${version}-win32-${arch}-setup.exe`,
                    setupIcon: path.resolve(__dirname, 'src', 'assets', 'api-video-logo.ico'),
                    // certificateFile: process.env['WINDOWS_CODESIGN_FILE'],
                    // certificatePassword: process.env['WINDOWS_CODESIGN_PASSWORD'],
                };
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        {
            name: '@electron-forge/maker-deb',
            platforms: ['linux'],
            config: commonLinuxConfig,
        },
        {
            name: '@electron-forge/maker-rpm',
            platforms: ['linux'],
            config: commonLinuxConfig,
        },
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'electron',
                    name: 'fiddle',
                },
                draft: true,
                prerelease: false,
            },
        },
    ],
};

function notarizeMaybe() {
    if (process.platform !== 'darwin') {
        return;
    }

    if (!process.env.CI) {
        console.log(`Not in CI, skipping notarization`);
        return;
    }

    if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
        console.warn(
            'Should be notarizing, but environment variables APPLE_ID or APPLE_ID_PASSWORD are missing!',
        );
        return;
    }

    config.packagerConfig.osxNotarize = {
        appBundleId: 'video.api.synchronizer',
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_ID_PASSWORD,
        ascProvider: 'LT94ZKYDCJ',
    };
}

notarizeMaybe();

// Finally, export it
module.exports = config;