import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

/**
 * Upload avatar image to Supabase Storage
 * @param userId - User ID for file path
 * @returns Public URL of uploaded avatar
 */
export const uploadAvatar = async (userId: string): Promise<string | null> => {
    try {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permission denied');
        }

        // Pick image
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });

        if (result.canceled || !result.assets[0]) {
            return null;
        }

        const image = result.assets[0];
        const fileExt = image.uri.split('.').pop() || 'jpg';
        const filePath = `${userId}/avatar.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, decode(image.base64!), {
                contentType: `image/${fileExt}`,
                upsert: true,
            });

        if (uploadError) {
            throw uploadError;
        }

        // Get public URL
        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
};

/**
 * Delete avatar from Supabase Storage
 * @param userId - User ID for file path
 */
export const deleteAvatar = async (userId: string): Promise<void> => {
    try {
        const { data: files } = await supabase.storage
            .from('avatars')
            .list(userId);

        if (!files || files.length === 0) return;

        const filePaths = files.map(file => `${userId}/${file.name}`);

        const { error } = await supabase.storage
            .from('avatars')
            .remove(filePaths);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting avatar:', error);
        throw error;
    }
};

/**
 * Upload message attachment
 * @param userId - User ID for file path
 * @param messageId - Message ID for file naming
 * @returns Path of uploaded file
 */
export const uploadMessageAttachment = async (
    userId: string,
    messageId: string
): Promise<string | null> => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permission denied');
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
            base64: true,
        });

        if (result.canceled || !result.assets[0]) {
            return null;
        }

        const image = result.assets[0];
        const fileExt = image.uri.split('.').pop() || 'jpg';
        const filePath = `${userId}/${messageId}.${fileExt}`;

        const { error } = await supabase.storage
            .from('message-attachments')
            .upload(filePath, decode(image.base64!), {
                contentType: `image/${fileExt}`,
            });

        if (error) throw error;

        return filePath;
    } catch (error) {
        console.error('Error uploading attachment:', error);
        throw error;
    }
};

/**
 * Get signed URL for private attachment
 * @param filePath - Path in storage bucket
 * @returns Signed URL valid for 1 hour
 */
export const getAttachmentUrl = async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
        .from('message-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
};

/**
 * Update user profile picture URL in database
 * @param userId - User ID
 * @param pictureUrl - New picture URL
 */
export const updateProfilePicture = async (
    userId: string,
    pictureUrl: string
): Promise<void> => {
    const { error } = await supabase
        .from('profiles')
        .update({ picture: pictureUrl })
        .eq('id', userId);

    if (error) throw error;
};
