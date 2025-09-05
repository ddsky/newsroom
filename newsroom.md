# Idea and Concept
I run a news API at https://worldnewsapi.com. Audience is developers but maybe also agencies.
I want to offer a standalone electron app called "World Newsroom" that offers all functionality from the API in a visual interface.
The app should have the following functionality:
* search and filter news: A UI that allows setting filters and sorting for the search news endpoint: https://worldnewsapi.com/docs/search-news/
* a page listing the top news: the user should be able to select country and language
* a page showing the current front pages of selected news outlets. The user should be able to select a news outlet and then we always pull the latest front page
* User can create an arbitrary amount of "folders" which have a name.
* saving news: whenever a news card is displayed, the user can add it to a folder.
* save searches: the user should be able to save a search query with all its filters. The saved searches when triggered should show results like the normal search

Settings are always saved on the local machine of the user using the app.

# Model
News Card:
```
{
    "id": 2352,
    "title": "While China and the US squabble, the world’s debt and climate crises worsen - Amnesty International",
    "text": "...",
    "summary": "...",
    "url": "https://www.amnesty.org/en/latest/news/2020/09/while-china-and-the-us-squabble-the-world-debt-and-climate-crises-worsen/",
    "image": "https://www.amnesty.org/en/wp-content/uploads/2021/06/272748-1024x433.jpg",
    "video": null,
    "publish_date": "2020-09-11 18:05:26",
    "authors": [
        "Amnesty International",
        "William Nee"
    ],
    "language": "en",
    "category": "politics",
    "source_country": "mx",
    "sentiment": -0.176
}
```

# API
API docs are here https://worldnewsapi.com/docs/

## Search News
Request and response examples: https://worldnewsapi.com/docs/search-news/

## Top News
Request and response examples: https://worldnewsapi.com/docs/top-news/

## Front Pages
Request and response examples: https://worldnewsapi.com/docs/newspaper-front-pages/

# Example Scenarios
When the user first opens the app and there is not API key saved on the machine, the user is asked to enter a key. Without that the user can't use the app.


# Audience
People testing the API.
Others that I don't know about.

# Business Model
Free app but while using it, the API key is used and tokens are used.

# Guiding Principles

# Name / Claim / Tagline

# Technologies
Electron app so that people can download it.

# Other