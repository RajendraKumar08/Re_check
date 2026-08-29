const { Router } = require("express");
const router = Router();
const ai = require("../services/gemini");

router.post('/project-questions', async (req, res) => {

    try {
        const { githubrepo } = req.body || {};

        if (!githubrepo) {
            return res.status(400).json({
                error: "Please provide a GitHub repo."
            });
        }

        // Validate GitHub URL
        let url;

        try {
            url = new URL(githubrepo);
        } catch (error) {
            return res.status(400).json({
                error: "Please provide a valid GitHub repo URL."
            });
        }

        // Check hostname
        if (
            url.hostname !== "github.com" &&
            url.hostname !== "www.github.com"
        ) {
            return res.status(400).json({
                error: "Please provide a valid GitHub repo URL."
            });
        }

        // Check repo path: github.com/username/repository
        const pathParts = url.pathname.split("/").filter(Boolean);

        if (pathParts.length < 2) {
            return res.status(400).json({
                error: "Please provide a valid GitHub repository URL."
            });
        }

        const prompt = `
            github repository URL:
            ${githubrepo}

            You are a software developer interviewer. Analyze the given GitHub repository and generate interview questions based on the actual project, its code, architecture, technologies, and implementation. The questions should test whether the candidate genuinely understands their project and should focus on practical, conceptual, and project-specific aspects rather than generic questions. The response should be an array of 10 objects with 'question' and 'answer' keys.

            {
                question : "",
                answer : "",
            }
        `;

        const interaction = await ai.interactions.create({
            model: "gemini-3.6-flash",
            input: prompt
        });

        const response = interaction.output_text;

        const cleanedResponse = response
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const result = JSON.parse(cleanedResponse);

        return res.json(result);

    } catch (error) {
        console.log("Error in /project-questions", error);

        return res.status(500).json({
            error: error.message || "Failed to generate project questions."
        });
    }
});

module.exports = router;