const express = require('express');
const { pool } = require('../server');
const authenticateToken = require('../middleware/authenticateToken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { updateRecommendationsForUser } = require('../services/recommendationService');

const router = express.Router();

// --- Multer Configuration for File Uploads ---
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        req.fileValidationError = 'Only image files (jpg, jpeg, png, gif) are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: fileFilter
}).array('photos', 5); // Field name 'photos', max 5 files

// --- Profile Routes ---

// GET /api/users/me/profile - Get own profile
router.get('/me/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            `SELECT user_id, nickname, email, gender, 
                    TO_CHAR(birth_date, 'YYYY-MM-DD') as birth_date, 
                    height_cm, weight_kg, occupation, salary_range, 
                    orientation, bio, avatar_url, 
                    location_geohash, location_latitude, location_longitude,
                    preferred_age_min, preferred_age_max, preferred_gender,
                    tags, values_description, q_and_a
             FROM users WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "User profile not found." } });
        }

        const userProfile = result.rows[0];
        const photosResult = await pool.query("SELECT photo_id, url, is_avatar FROM user_photos WHERE user_id = $1 ORDER BY uploaded_at DESC", [userId]);
        userProfile.photos = photosResult.rows;

        const avatarPhoto = userProfile.photos.find(p => p.is_avatar);
        if (avatarPhoto && userProfile.avatar_url !== avatarPhoto.url) {
            userProfile.avatar_url = avatarPhoto.url;
        }

        res.status(200).json(userProfile);
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while fetching the profile." } });
    }
});

// PUT /api/users/me/profile - Update own profile
router.put('/me/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const {
        nickname, gender, birth_date, height, weight, occupation,
        salary, orientation, bio,
        location_geohash, location_latitude, location_longitude,
        preferred_age_min, preferred_age_max, preferred_gender,
        tags, values_description, q_and_a
    } = req.body;

    if (birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid birth_date format. Use YYYY-MM-DD." } });
    }
    if (tags && !Array.isArray(tags)) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Tags must be an array." } });
    }
    if (q_and_a && typeof q_and_a !== 'object') {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "q_and_a must be an object." } });
    }

    try {
        if (nickname) {
            const nicknameCheck = await pool.query(
                "SELECT user_id FROM users WHERE nickname = $1 AND user_id != $2",
                [nickname, userId]
            );
            if (nicknameCheck.rows.length > 0) {
                return res.status(409).json({ error: { code: "CONFLICT", message: "Nickname already taken by another user." } });
            }
        }

        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;

        const addField = (field, value) => {
            if (value !== undefined) {
                updateFields.push(`${field} = $${paramIndex++}`);
                queryParams.push(value);
            }
        };

        addField('nickname', nickname);
        addField('gender', gender);
        addField('birth_date', birth_date);
        addField('height_cm', height);
        addField('weight_kg', weight);
        addField('occupation', occupation);
        addField('salary_range', salary);
        addField('orientation', orientation);
        addField('bio', bio);
        addField('location_geohash', location_geohash);
        addField('location_latitude', location_latitude);
        addField('location_longitude', location_longitude);
        addField('preferred_age_min', preferred_age_min);
        addField('preferred_age_max', preferred_age_max);
        addField('preferred_gender', preferred_gender);
        addField('tags', tags);
        addField('values_description', values_description);
        if (q_and_a !== undefined) {
            updateFields.push(`q_and_a = $${paramIndex++}`);
            queryParams.push(JSON.stringify(q_and_a));
        }


        if (updateFields.length === 0) {
            return res.status(400).json({ error: { code: "INVALID_INPUT", message: "No fields provided for update." } });
        }

        updateFields.push(`updated_at = NOW()`);
        const updateQuery = `
            UPDATE users SET ${updateFields.join(', ')}
            WHERE user_id = $${paramIndex}
            RETURNING user_id, nickname, email, gender, 
                      TO_CHAR(birth_date, 'YYYY-MM-DD') as birth_date, 
                      height_cm, weight_kg, occupation, salary_range, 
                      orientation, bio, avatar_url,
                      location_geohash, location_latitude, location_longitude,
                      preferred_age_min, preferred_age_max, preferred_gender,
                      tags, values_description, q_and_a;
        `;
        queryParams.push(userId);

        const result = await pool.query(updateQuery, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found or no update made." } });
        }
        
        const updatedProfile = result.rows[0];
        const photosResult = await pool.query("SELECT photo_id, url, is_avatar FROM user_photos WHERE user_id = $1 ORDER BY uploaded_at DESC", [userId]);
        updatedProfile.photos = photosResult.rows;
        
        res.status(200).json({
            message: "Profile updated successfully",
            updatedProfile: updatedProfile
        });

        // Trigger recommendation update asynchronously
        // Only trigger if relevant fields for recommendation were updated
        const relevantFieldsForReco = [
            'gender', 'birth_date', 'occupation', 'salary_range', 'orientation', 'bio',
            'location_geohash', 'location_latitude', 'location_longitude',
            'preferred_age_min', 'preferred_age_max', 'preferred_gender',
            'tags', 'values_description', 'q_and_a'
        ];
        const wasRelevantFieldUpdated = relevantFieldsForReco.some(field => req.body.hasOwnProperty(field));

        if (wasRelevantFieldUpdated) {
            updateRecommendationsForUser(userId).catch(err => {
                console.error(`Failed to trigger recommendation update for user ${userId} after profile update:`, err);
            });
        }

    } catch (error) {
        console.error("Update profile error:", error);
        if (error.code === '23505' && error.constraint === 'users_nickname_key') {
             return res.status(409).json({ error: { code: "CONFLICT", message: "Nickname already exists." } });
        }
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while updating the profile." } });
    }
});

// GET /api/users/{userId}/profile - Get other user's public profile
router.get('/:userId/profile', authenticateToken, async (req, res) => {
    const requestedUserId = req.params.userId;
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.nickname, u.gender, 
                    EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
                    u.occupation, u.bio, u.avatar_url, u.tags,
                    (SELECT json_agg(json_build_object('photoId', p.photo_id, 'url', p.url, 'isAvatar', p.is_avatar)) 
                     FROM user_photos p WHERE p.user_id = u.user_id ORDER BY p.is_avatar DESC, p.uploaded_at DESC) as photos
             FROM users u
             WHERE u.user_id = $1`,
            [requestedUserId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "User profile not found." } });
        }
        
        const userProfile = result.rows[0];
        // Ensure avatarUrl is correctly set based on photos array
        const avatarPhoto = userProfile.photos ? userProfile.photos.find(p => p.isavatar) : null;
        userProfile.avatarUrl = avatarPhoto ? avatarPhoto.url : userProfile.avatar_url;

        // Simplify public profile data if needed, e.g. remove email
        // For now, returning most of it as per api.md for /me/profile, but should be curated for public view
        const publicProfile = {
            userId: userProfile.user_id,
            nickname: userProfile.nickname,
            age: userProfile.age, // Calculated age
            gender: userProfile.gender,
            occupation: userProfile.occupation,
            bio: userProfile.bio,
            avatarUrl: userProfile.avatarUrl,
            photos: userProfile.photos ? userProfile.photos.map(p => ({ photoId: p.photoid, url: p.url, isAvatar: p.isavatar })) : [],
            tags: userProfile.tags
        };
        
        res.status(200).json(publicProfile);
    } catch (error) {
        console.error("Get other user profile error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred." } });
    }
});

// --- Photo Management Routes ---

// POST /api/users/me/photos - Upload profile photo(s)
router.post('/me/photos', authenticateToken, (req, res) => {
    upload(req, res, async function (err) {
        if (req.fileValidationError) {
            return res.status(400).json({ error: { code: "INVALID_INPUT", message: req.fileValidationError } });
        } else if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: { code: "LIMIT_FILE_SIZE", message: "File is too large. Max 5MB." } });
            }
            return res.status(400).json({ error: { code: "UPLOAD_ERROR", message: `Multer error: ${err.message}` } });
        } else if (err) {
            return res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: `Unknown upload error: ${err.message}` } });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: { code: "NO_FILE", message: "No photo(s) uploaded." } });
        }

        const userId = req.user.userId;
        const uploadedPhotosData = [];

        try {
            for (const file of req.files) {
                const photoId = uuidv4();
                // Store relative path or full URL depending on how you serve static files
                const photoUrl = `/uploads/${file.filename}`; // Example: /uploads/photos-1616161616-12345.jpg

                const insertQuery = `
                    INSERT INTO user_photos (photo_id, user_id, url, is_avatar)
                    VALUES ($1, $2, $3, $4)
                    RETURNING photo_id, url, is_avatar;
                `;
                // By default, new photos are not set as avatar
                const result = await pool.query(insertQuery, [photoId, userId, photoUrl, false]);
                uploadedPhotosData.push(result.rows[0]);
            }

            res.status(201).json({
                message: "Photo(s) uploaded successfully",
                uploadedPhotos: uploadedPhotosData
            });
        } catch (dbError) {
            console.error("Error saving photo info to DB:", dbError);
            // Attempt to clean up uploaded files if DB insert fails
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (unlinkErr) {
                    console.error("Error deleting uploaded file after DB error:", unlinkErr);
                }
            });
            res.status(500).json({ error: { code: "DB_ERROR", message: "Failed to save photo information." } });
        }
    });
});

// DELETE /api/users/me/photos/{photoId} - Delete a profile photo
router.delete('/me/photos/:photoId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { photoId } = req.params;

    if (!uuidValidate(photoId)) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid photo ID format." } });
    }

    try {
        // First, get the photo URL to delete the file from storage
        const photoResult = await pool.query(
            "SELECT url, is_avatar FROM user_photos WHERE photo_id = $1 AND user_id = $2",
            [photoId, userId]
        );

        if (photoResult.rows.length === 0) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "Photo not found or does not belong to user." } });
        }

        const photoData = photoResult.rows[0];
        const photoPath = path.join(UPLOADS_DIR, path.basename(photoData.url)); // Assumes URL is like /uploads/filename.ext

        // Delete from database
        const deleteResult = await pool.query(
            "DELETE FROM user_photos WHERE photo_id = $1 AND user_id = $2 RETURNING photo_id",
            [photoId, userId]
        );

        if (deleteResult.rowCount === 0) {
            // Should not happen if previous check passed, but as a safeguard
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "Photo not found or could not be deleted." } });
        }

        // Delete file from server storage
        if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
        }

        // If the deleted photo was the avatar, clear the avatar_url in the users table
        if (photoData.is_avatar) {
            await pool.query("UPDATE users SET avatar_url = NULL WHERE user_id = $1", [userId]);
        }

        res.status(200).json({ message: "Photo deleted successfully" });

    } catch (error) {
        console.error("Delete photo error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while deleting the photo." } });
    }
});

// PUT /api/users/me/avatar - Set a photo as avatar
router.put('/me/avatar', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { photoId } = req.body;

    if (!photoId) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "photoId is required." } });
    }
    if (!uuidValidate(photoId)) { // Helper function uuidValidate would be needed
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid photo ID format." } });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction

        // 1. Verify photo belongs to user and get its URL
        const photoResult = await client.query(
            "SELECT url FROM user_photos WHERE photo_id = $1 AND user_id = $2",
            [photoId, userId]
        );

        if (photoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "Photo not found or does not belong to user." } });
        }
        const newAvatarUrl = photoResult.rows[0].url;

        // 2. Set all other photos for this user to is_avatar = false
        await client.query(
            "UPDATE user_photos SET is_avatar = FALSE WHERE user_id = $1 AND photo_id != $2",
            [userId, photoId]
        );

        // 3. Set the selected photo to is_avatar = true
        const updatePhotoResult = await client.query(
            "UPDATE user_photos SET is_avatar = TRUE WHERE photo_id = $1 AND user_id = $2",
            [photoId, userId]
        );
        if (updatePhotoResult.rowCount === 0) { // Should not happen if first check passed
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: { code: "UPDATE_FAILED", message: "Failed to set photo as avatar." } });
        }

        // 4. Update the avatar_url in the users table
        await client.query(
            "UPDATE users SET avatar_url = $1 WHERE user_id = $2",
            [newAvatarUrl, userId]
        );

        await client.query('COMMIT'); // Commit transaction
        client.release();

        res.status(200).json({
            message: "Avatar updated successfully",
            avatarUrl: newAvatarUrl
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
            client.release();
        }
        console.error("Set avatar error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while setting the avatar." } });
    }
});

// Helper function to validate UUID (can be placed in a utils file)
const uuidValidate = (uuid) => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
};


module.exports = router;
