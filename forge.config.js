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


const config = {
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
                return {
                    name: 'api-video-synchronizer',
                    authors: 'api.video',
                    exe: 'api-video-synchronizer.exe',
                    setupExe: `api-video-synchronizer-win32-${arch}-setup.exe`,
                    setupIcon: path.resolve(__dirname, 'src', 'assets', 'api-video-logo.ico'),
                };
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            platforms: ['darwin'],
            config: {
                format: 'ULFO',
                name: 'api-video-synchronizer',
                icon: path.resolve(__dirname, 'src', 'assets', 'api-video-logo.icns'),
            }
        }
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
        appleIdPassword: process.env.APPLE_ID_PASSWORD
    };
}

notarizeMaybe();

// Finally, export it
module.exports = config;