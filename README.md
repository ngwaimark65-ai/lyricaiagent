# Lyric: Your Smart Learning Partner

Build a polished AI SaaS web application called Lyric 



CORE VISION:

Nova is a general-purpose AI assistant that can answer both education-related and non-education-related questions. Its major differentiation is that it has powerful education and tutoring features built directly into the normal AI chat experience.



Lyric should NOT feel like a basic homework chatbot. Users should be able to ask about anything, just like a general AI assistant, while lyric can recognize educational conversations and offer learning tools.



TARGET USERS:

Primarily students, but the AI should be useful to anyone.



BRAND:

Name: lyric

Tagline: "One AI. Everything you need."

Style: modern, premium, clean, futuristic but approachable.

Use a dark interface with excellent typography, subtle gradients, smooth animations and generous spacing.

The interface should feel like a serious technology company, not a school website.



CORE APP STRUCTURE:



1. LANDING PAGE

Create a professional homepage with:

- lyric logo

- Hero headline: "One AI. Everything you need."

- Subheadline explaining that lyriccan answer everyday questions and help users learn, study and create.

- Large "Try lyric" button

- Feature sections

- Education feature showcase

- Pricing preview

- FAQ

- Footer



2. AUTHENTICATION

Create:

- Sign up

- Login

- Forgot password

- Google sign-in placeholder

Do not implement fake authentication. Structure it so Supabase authentication can be connected later.



3. MAIN AI CHAT

Create the main lyric chat interface.



The chat should include:

- Sidebar with conversation history

- New conversation button

- Search conversations

- Main conversation area

- User and AI messages

- Message composer

- Attachment button

- Image upload button

- Voice button placeholder

- Send button



The user should be able to ask ANY type of question.



Examples:

"What is photosynthesis?"

"What is happening in the world?"

"Help me write an email."

"Explain quantum physics."

"Give me business ideas."

"What is 25% of 840?"



Do not restrict the AI to education.



4. EDUCATION INTELLIGENCE



Lyric should recognize when a conversation is educational.



For example, if the user is studying:

- Mathematics

- Physics

- Chemistry

- Biology

- History

- Geography

- Economics

- Accounting

- Computer Science

- Languages



Lyric should be able to enter a tutoring-style interaction.



Instead of always giving a short answer, lyric can explain concepts step-by-step and encourage understanding.



IMPORTANT QUIZ FEATURE:



When lyric detects that the user is learning or repeatedly asking educational questions about a topic, lyric can naturally offer:



"Would you like me to give you a short quiz on this topic?"



Display two buttons:



[ Yes, quiz me ] [ Not now ]



If the user selects "Yes, quiz me":

- lyric  creates a quiz based on the conversation/topic.

- Ask one question at a time.

- Allow the user to answer.

- Mark the answer.

- Explain why it is correct or incorrect.

- Continue until the quiz is complete.

- Show a final score.

- Identify weak areas.

- Offer another quiz or a simpler explanation.



If the user selects "Not now":

- Continue the normal conversation.

- Do not repeatedly interrupt the user with quiz suggestions.



5. EDUCATION TOOLS



Create a tools section with:



🎓 Tutor Mode

📝 Quiz

📚 Flashcards

📅 Study Plan

📸 Solve from Image

📊 Progress



These should initially have polished UI states/placeholders where the backend functionality has not yet been implemented.



6. IMAGE QUESTION FEATURE



Allow users to upload an image of:

- Homework

- Textbook questions

- Handwritten work

- Diagrams

- Equations



Create the UI for image upload and analysis.



Do not fake AI image analysis yet. Prepare the architecture for connecting an AI vision API later.



7. CHAT PERSONALIZATION



Create a user profile/settings area where users can eventually specify:

- Grade/year

- Subjects

- Learning goals

- Preferred explanation style

- Language



This information should eventually be stored in the user's profile and used to personalize tutoring.



8. CONVERSATION MEMORY



Design the application architecture so conversations can eventually be saved and retrieved using Supabase.



Each user should have:

- Conversations

- Messages

- User profile

- Learning preferences

- Quiz history

- Progress



9. PRICING



Create a pricing page with three plans:



FREE

- General AI chat

- Basic tutoring

- Limited quizzes

- Limited image questions

- Limited daily usage



Lyric PLUS

- More AI usage

- More quizzes

- More image questions

- Advanced tutoring

- Study plans

- Flashcards

- Voice features when available



Lyric PRO

- Highest usage limits

- Advanced AI models when available

- More image analysis

- Advanced education features

- Priority generation

- Future creative features



Do NOT connect real payments yet.

Create the subscription architecture so Stripe or another payment provider can be integrated later.



10. USAGE/CREDITS



Create a usage indicator in the dashboard.



Show:

"AI usage remaining"



The system should be designed so that different AI operations can consume different amounts of usage.



Do not implement actual billing yet.



11. DASHBOARD



Create a dashboard showing:

- Welcome message

- Recent conversations

- Continue learning section

- Suggested quiz

- Study progress

- Usage remaining

- Quick actions



12. MOBILE RESPONSIVENESS



The application must work beautifully on:

- Desktop

- Tablet

- Mobile



The mobile chat experience is extremely important.



13. TECHNICAL ARCHITECTURE



Use a clean component-based architecture.



Prepare the project for:

- Supabase authentication

- Supabase database

- Supabase storage

- AI model APIs

- Vision APIs

- Voice APIs

- Future image generation

- Future video generation

- Subscription/payment integration



Do not create fake AI responses and do not pretend that unfinished APIs are working.



Build the frontend, navigation, states, components and database-ready architecture cleanly so we can connect the real AI systems in later steps.



IMPORTANT:

Do not try to build every backend feature in this first step.

Focus on creating an excellent, production-quality frontend and application structure that we can build upon incrementally.



The result should look like the beginning of a serious AI technology company.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lyricaiagent.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9c9bea1f-9112-479a-88ae-2a4a7e01e87e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
