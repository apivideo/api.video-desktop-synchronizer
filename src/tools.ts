import ApiVideoClient from "@api.video/nodejs-client";

export const isApiKeyValid = async (apiKey: string): Promise<boolean> => {
    try {
        await new ApiVideoClient({apiKey}).getAccessToken();
        return true;
    } catch(e) {
        return false;
    }
}