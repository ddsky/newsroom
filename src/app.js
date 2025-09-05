// World Newsroom App
class NewsroomApp {
    constructor() {
        this.settings = null;
        this.currentPage = 'search';
        this.apiBaseUrl = 'https://api.worldnewsapi.com';
    // Region names helper (lazy init)
    this._regionDisplayNames = null;
    // Front pages sources cache
    this.frontPageSources = null; // { countries: Map<code, name>, sources: Array<{displayName,countryCode,languageCode,identifier}> }
        
    this.init();
    // Front pages pagination state
    this.frontPagesState = null; // { country, date, identifiers, nextIndex }
    // Search pagination state
    this.searchState = null; // { params, offset, number }
    }

    async init() {
        await this.loadSettings();
    // Populate selectors with full lists before setting default values
    this.populateSelectors();
        this.setupEventListeners();
        this.setDefaultFormValues();
        this.checkApiKey();
        this.renderSavedSearches();
        this.renderFolders();
    // Lazy load and prepare front page sources and dropdowns
    this.prepareFrontPagesFilters();
    }

    // Get readable domain from a URL
    getDomain(url) {
        try {
            const u = new URL(url);
            // Strip www.
            return u.hostname.replace(/^www\./i, '');
        } catch (e) {
            return 'Open';
        }
    }

    // Convert ISO 3166-1 alpha-2 country code to English display name
    countryCodeToName(code) {
        if (!code) return '';
        try {
            if (!this._regionDisplayNames && typeof Intl !== 'undefined' && Intl.DisplayNames) {
                this._regionDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
            }
            if (this._regionDisplayNames) {
                return this._regionDisplayNames.of(code.toUpperCase()) || code.toUpperCase();
            }
        } catch (_) { /* ignore */ }

        // Fallback minimal mapping
        const map = {
            US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France', CA: 'Canada', AU: 'Australia',
            IT: 'Italy', ES: 'Spain', CN: 'China', JP: 'Japan', IN: 'India', BR: 'Brazil', RU: 'Russia', NL: 'Netherlands',
            SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', CZ: 'Czechia', AT: 'Austria',
            CH: 'Switzerland', BE: 'Belgium', PT: 'Portugal', IE: 'Ireland', MX: 'Mexico', AR: 'Argentina', ZA: 'South Africa',
            KR: 'South Korea', TR: 'Turkey', GR: 'Greece', IL: 'Israel', UA: 'Ukraine'
        };
        return map[code.toUpperCase()] || code.toUpperCase();
    }

    async loadSettings() {
        try {
            this.settings = await window.electronAPI.getSettings();
            if (!this.settings) {
                this.settings = {
                    apiKey: '',
                    savedSearches: [],
                    folders: [],
                    savedNews: {},
                    preferences: {
                        defaultCountry: 'us',
                        defaultLanguage: 'en',
                        theme: 'light'
                    }
                };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await window.electronAPI.saveSettings(this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.getAttribute('data-page');
                this.switchPage(page);
            });
        });

        // Header logo -> open in default browser
        const logoLink = document.getElementById('logo-link');
        if (logoLink) {
            logoLink.addEventListener('click', (e) => {
                e.preventDefault();
                const href = logoLink.getAttribute('href') || 'https://worldnewsapi.com';
                if (window?.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(href);
                } else {
                    window.open(href, '_blank', 'noopener');
                }
            });
        }

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });

        // Settings modal
        document.getElementById('settings-modal-close').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('settings-cancel-btn').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('settings-save-btn').addEventListener('click', () => {
            this.saveSettingsModal();
        });

        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => {
            this.performSearch(true);
        });

        document.getElementById('clear-search-btn').addEventListener('click', () => {
            this.clearSearch();
        });

        document.getElementById('save-search-btn').addEventListener('click', () => {
            this.saveCurrentSearch();
        });

        // Top news
        document.getElementById('load-top-news-btn').addEventListener('click', () => {
            this.loadTopNews();
        });

        // Front pages
        document.getElementById('load-front-pages-btn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            if (btn.disabled) return;
            this.loadFrontPages();
        });
        // Update sources list on country change
        const countrySel = document.getElementById('front-pages-country');
        if (countrySel) {
            countrySel.addEventListener('change', () => {
                this.updateFrontPageSourcesDropdown();
                this.updateFrontPagesControlsState();
            });
        }

        // Folders
        document.getElementById('create-folder-btn').addEventListener('click', () => {
            this.createFolder();
        });

        // Listen for settings open from main process
        window.electronAPI.onOpenSettings(() => {
            this.openSettings();
        });

    // Enter key for search
        document.getElementById('search-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
        this.performSearch(true);
            }
        });

    // Date presets for earliest date
    const presetSel = document.getElementById('earliest-date-preset');
    if (presetSel) {
        presetSel.addEventListener('change', () => this.applyEarliestDatePreset());
    }
    }

    // ----- Selectors population (countries & languages) -----
    populateSelectors() {
        try {
            this.populateCountrySelectors();
            this.populateLanguageSelectors();
        } catch (e) {
            console.error('Failed to populate selectors:', e);
        }
    }

    getSupportedCountryCodes() {
        // Full ISO 3166-1 alpha-2 list (lowercase)
        return [
            'ad','ae','af','ag','ai','al','am','ao','aq','ar','as','at','au','aw','ax','az',
            'ba','bb','bd','be','bf','bg','bh','bi','bj','bl','bm','bn','bo','bq','br','bs','bt','bv','bw','by','bz',
            'ca','cc','cd','cf','cg','ch','ci','ck','cl','cm','cn','co','cr','cu','cv','cw','cx','cy','cz',
            'de','dj','dk','dm','do','dz',
            'ec','ee','eg','eh','er','es','et',
            'fi','fj','fk','fm','fo','fr',
            'ga','gb','gd','ge','gf','gg','gh','gi','gl','gm','gn','gp','gq','gr','gs','gt','gu','gw','gy',
            'hk','hm','hn','hr','ht','hu',
            'id','ie','il','im','in','io','iq','ir','is','it',
            'je','jm','jo','jp',
            'ke','kg','kh','ki','km','kn','kp','kr','kw','ky','kz',
            'la','lb','lc','li','lk','lr','ls','lt','lu','lv','ly',
            'ma','mc','md','me','mf','mg','mh','mk','ml','mm','mn','mo','mp','mq','mr','ms','mt','mu','mv','mw','mx','my','mz',
            'na','nc','ne','nf','ng','ni','nl','no','np','nr','nu','nz',
            'om',
            'pa','pe','pf','pg','ph','pk','pl','pm','pn','pr','ps','pt','pw','py',
            'qa',
            're','ro','rs','ru','rw',
            'sa','sb','sc','sd','se','sg','sh','si','sj','sk','sl','sm','sn','so','sr','ss','st','sv','sx','sy','sz',
            'tc','td','tf','tg','th','tj','tk','tl','tm','tn','to','tr','tt','tv','tw','tz',
            'ua','ug','um','us','uy','uz',
            'va','vc','ve','vg','vi','vn','vu',
            'wf','ws',
            'ye','yt',
            'za','zm','zw'
        ];
    }

    getSupportedLanguages() {
        // Languages from World News API docs (ISO 639-1)
        return [
            { code: 'ar', name: 'Arabic' },
            { code: 'bg', name: 'Bulgarian' },
            { code: 'ca', name: 'Catalan' },
            { code: 'cs', name: 'Czech' },
            { code: 'da', name: 'Danish' },
            { code: 'de', name: 'German' },
            { code: 'el', name: 'Greek' },
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'et', name: 'Estonian' },
            { code: 'fi', name: 'Finnish' },
            { code: 'fr', name: 'French' },
            { code: 'he', name: 'Hebrew' },
            { code: 'hi', name: 'Hindi' },
            { code: 'hr', name: 'Croatian' },
            { code: 'hu', name: 'Hungarian' },
            { code: 'id', name: 'Indonesian' },
            { code: 'it', name: 'Italian' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' },
            { code: 'lt', name: 'Lithuanian' },
            { code: 'lv', name: 'Latvian' },
            { code: 'ms', name: 'Malay' },
            { code: 'nl', name: 'Dutch' },
            { code: 'no', name: 'Norwegian' },
            { code: 'pl', name: 'Polish' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'ro', name: 'Romanian' },
            { code: 'ru', name: 'Russian' },
            { code: 'sk', name: 'Slovak' },
            { code: 'sl', name: 'Slovene' },
            { code: 'sv', name: 'Swedish' },
            { code: 'th', name: 'Thai' },
            { code: 'tr', name: 'Turkish' },
            { code: 'uk', name: 'Ukrainian' },
            { code: 'vi', name: 'Vietnamese' },
            { code: 'zh', name: 'Chinese' }
        ];
    }

    populateCountrySelectors() {
        const codes = this.getSupportedCountryCodes();
        // Build sorted list by display name
        const items = codes.map(code => ({ code, name: this.countryCodeToName(code) }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const setOptions = (el, withAny = false, anyLabel = 'Any') => {
            if (!el) return;
            const anyOpt = withAny ? `<option value="">${anyLabel}</option>` : '';
            el.innerHTML = anyOpt + items.map(i => `\n<option value="${i.code}">${this.escapeHtml(i.name)} (${i.code.toUpperCase()})</option>`).join('');
        };

        setOptions(document.getElementById('search-country'), true, 'Any');
        setOptions(document.getElementById('top-news-country'), false);
        setOptions(document.getElementById('default-country'), false);
        // Do NOT touch front-pages-country here; it is populated from CSV
    }

    populateLanguageSelectors() {
        const langs = this.getSupportedLanguages();
        const items = langs.sort((a, b) => a.name.localeCompare(b.name));

        const setOptions = (el, withAny = false, anyLabel = 'Any') => {
            if (!el) return;
            const anyOpt = withAny ? `<option value="">${anyLabel}</option>` : '';
            el.innerHTML = anyOpt + items.map(i => `\n<option value="${i.code}">${this.escapeHtml(i.name)} (${i.code.toUpperCase()})</option>`).join('');
        };

        setOptions(document.getElementById('search-language'), true, 'Any');
        setOptions(document.getElementById('top-news-language'), false);
        setOptions(document.getElementById('default-language'), false);
    }

    switchPage(pageId) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        // Update page content
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageId}-page`).classList.add('active');

        this.currentPage = pageId;

    // Load page-specific content
        switch (pageId) {
            case 'saved':
                this.renderSavedNews();
                break;
            case 'folders':
                this.renderFolders();
                break;
            case 'front-pages':
                this.updateFrontPagesControlsState();
                break;
        }
    }

    checkApiKey() {
        if (!this.settings.apiKey) {
            this.openSettings();
        }
    }

    openSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.add('active');
        
        // Populate current settings
        document.getElementById('api-key-input').value = this.settings.apiKey || '';
        document.getElementById('default-country').value = this.settings.preferences.defaultCountry || 'us';
        document.getElementById('default-language').value = this.settings.preferences.defaultLanguage || 'en';

        // Ensure API key is masked initially
        const apiInput = document.getElementById('api-key-input');
        const toggleBtn = document.getElementById('api-key-toggle');
        if (apiInput && toggleBtn) {
            apiInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
            toggleBtn.onclick = () => {
                const showing = apiInput.type === 'text';
                apiInput.type = showing ? 'password' : 'text';
                toggleBtn.innerHTML = showing ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            };
        }

        // External link to API dashboard opens in default browser
        const apiLink = document.getElementById('api-key-link');
        if (apiLink) {
            apiLink.addEventListener('click', (e) => {
                e.preventDefault();
                const href = apiLink.getAttribute('href');
                if (href && window?.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(href);
                } else {
                    // Fallback: open in new tab if running in a non-electron context
                    window.open(href, '_blank', 'noopener');
                }
            }, { once: true });
        }
    }

    closeSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('active');
    }

    async saveSettingsModal() {
        const apiKey = document.getElementById('api-key-input').value.trim();
        const defaultCountry = document.getElementById('default-country').value;
        const defaultLanguage = document.getElementById('default-language').value;

        if (!apiKey) {
            await window.electronAPI.showErrorDialog('Error', 'API Key is required to use the application.');
            return;
        }

        this.settings.apiKey = apiKey;
        this.settings.preferences.defaultCountry = defaultCountry;
        this.settings.preferences.defaultLanguage = defaultLanguage;

        await this.saveSettings();
        this.closeSettings();
        
        // Set default values in forms
        this.setDefaultFormValues();
    }

    setDefaultFormValues() {
        document.getElementById('search-country').value = this.settings.preferences.defaultCountry;
        document.getElementById('search-language').value = this.settings.preferences.defaultLanguage;
        document.getElementById('top-news-country').value = this.settings.preferences.defaultCountry;
        document.getElementById('top-news-language').value = this.settings.preferences.defaultLanguage;
        const fpCountry = document.getElementById('front-pages-country');
        if (fpCountry) fpCountry.value = this.settings.preferences.defaultCountry;
        
        // Set today's date as default for front pages
        const today = new Date().toISOString().split('T')[0];
        const fpDate = document.getElementById('front-pages-date');
        if (fpDate) {
            fpDate.value = today;
            fpDate.max = today; // prevent picking future dates
        }

        // Update load button state based on country selection
        this.updateFrontPagesControlsState();
    }

    // ----- Front Pages helpers -----
    async prepareFrontPagesFilters() {
        try {
            // Parse CSV once
            if (!this.frontPageSources) {
                const csvText = await window.electronAPI.readAssetText('wna-front-page-sources.csv');
                if (!csvText) throw new Error('Could not read sources CSV');
                this.frontPageSources = this.parseFrontPageCSV(csvText);
            }
            // Populate country dropdown with all countries in CSV
            this.populateFrontPageCountries();
            // Set default value after options exist, then update available sources
            const defaultCountry = this.settings?.preferences?.defaultCountry || '';
            const countrySel = document.getElementById('front-pages-country');
            if (countrySel && defaultCountry) {
                countrySel.value = defaultCountry;
            }
            this.updateFrontPageSourcesDropdown();
            this.updateFrontPagesControlsState();
        } catch (e) {
            console.error('Failed to prepare front page filters:', e);
        }
    }

    updateFrontPagesControlsState() {
        const country = document.getElementById('front-pages-country')?.value || '';
        const btn = document.getElementById('load-front-pages-btn');
        if (btn) btn.disabled = !country;
    }

    parseFrontPageCSV(csvText) {
        // Expect columns: Display Name, Country Code, Language Code, Identifier (Source-Name)
        // Tab or multiple spaces separated. Normalize by splitting on tabs first, then fallback to commas.
        const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
        const sources = [];
        const countriesSet = new Map(); // code -> displayName
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (i === 0) continue; // header
            if (line.startsWith('#')) continue; // comments
            // The file appears to be TSV; split by tab
            let parts = line.split('\t');
            if (parts.length < 4) {
                // try splitting by multiple spaces as fallback
                parts = line.split(/\s{2,}/);
            }
            if (parts.length < 4) continue;
            const displayName = parts[0].trim();
            const countryCode = parts[1].trim();
            const languageCode = parts[2].trim();
            const identifier = parts[3].trim();
            if (!displayName || !countryCode || !identifier) continue;
            sources.push({ displayName, countryCode, languageCode, identifier });
            if (!countriesSet.has(countryCode)) {
                countriesSet.set(countryCode, this.countryCodeToName(countryCode));
            }
        }
        // Sort countries by display name
        const countries = Array.from(countriesSet.entries())
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        return { countries, sources };
    }

    populateFrontPageCountries() {
        const sel = document.getElementById('front-pages-country');
        if (!sel || !this.frontPageSources) return;
        // Keep first option (Any Country), remove the rest
        sel.innerHTML = '<option value="">Any Country</option>' +
            this.frontPageSources.countries.map(c => `\n<option value="${c.code}">${this.escapeHtml(c.name)} (${c.code.toUpperCase()})</option>`).join('');
    }

    updateFrontPageSourcesDropdown() {
        const country = document.getElementById('front-pages-country')?.value || '';
        const sourceSel = document.getElementById('front-pages-source');
        if (!sourceSel) return;
        if (!country) {
            // Disable source filter when no country chosen
            sourceSel.innerHTML = '<option value="">Any Newspaper</option>';
            sourceSel.disabled = true;
            return;
        }
        const list = (this.frontPageSources?.sources || []).filter(s => s.countryCode.toLowerCase() === country.toLowerCase());
        list.sort((a, b) => a.displayName.localeCompare(b.displayName));
        sourceSel.innerHTML = '<option value="">Any Newspaper</option>' +
            list.map(s => `\n<option value="${this.escapeHtml(s.identifier)}">${this.escapeHtml(s.displayName)}</option>`).join('');
        sourceSel.disabled = false;
    }

    async makeApiRequest(endpoint, params = {}) {
        if (!this.settings.apiKey) {
            throw new Error('API key not configured');
        }

        const url = new URL(`${this.apiBaseUrl}${endpoint}`);
        url.searchParams.append('api-key', this.settings.apiKey);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.append(key, value);
            }
        });

    // Debug log request
    const startedAt = Date.now();
    this.logDebug({ type: 'request', method: 'GET', url: url.toString(), meta: params });

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
                
                // Try to get more specific error from response body
                try {
                    const errorData = await response.text();
                    if (errorData) {
                        errorMessage += `. Details: ${errorData}`;
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
                
                this.logDebug({ type: 'response', method: 'GET', url: url.toString(), status: response.status, durationMs: Date.now() - startedAt, error: errorMessage });
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            this.logDebug({ type: 'response', method: 'GET', url: url.toString(), status: response.status, durationMs: Date.now() - startedAt, body: data });
            return data;
        } catch (error) {
            console.error('API request error for', endpoint, ':', error);
            this.logDebug({ type: 'response', method: 'GET', url: url.toString(), status: 'error', durationMs: Date.now() - startedAt, error: error?.message || String(error) });
            
            // Provide more user-friendly error messages
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error - please check your internet connection');
            } else if (error.message.includes('401')) {
                throw new Error('Invalid API key - please check your settings');
            } else if (error.message.includes('429')) {
                throw new Error('Rate limit exceeded - please try again later');
            }
            
            throw error;
        }
    }

    // Debug panel removed
    // Keep a no-op logger to avoid breaking internal logging calls
    logDebug(_) { /* no-op */ }

    showLoading() {
        document.getElementById('loading-overlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    async performSearch(reset = false) {
        if (!this.settings.apiKey) {
            this.checkApiKey();
            return;
        }

        const searchText = document.getElementById('search-text').value.trim();
        const language = document.getElementById('search-language').value;
        const country = document.getElementById('search-country').value;
        const category = document.getElementById('search-category').value;
        const earliestDate = document.getElementById('earliest-date').value;
        const latestDate = document.getElementById('latest-date').value;

        // Allow filter-only searches; require at least one criterion
        const hasAnyCriteria = !!(searchText || language || country || category || earliestDate || latestDate);
        if (!hasAnyCriteria) {
            await window.electronAPI.showErrorDialog('Error', 'Enter keywords or choose at least one filter to search.');
            return;
        }

        this.showLoading();

        try {
            const params = {
                text: searchText,
                language: language,
                'source-country': country,
                categories: category,
                'earliest-publish-date': earliestDate ? `${earliestDate} 00:00:00` : '',
                'latest-publish-date': latestDate ? `${latestDate} 23:59:59` : '',
                number: 25,
                offset: 0
            };

            // Manage pagination state
            if (reset || !this.searchState) {
                this.searchState = { params: { ...params }, offset: 0, number: 25 };
            } else {
                // continue from existing state
                this.searchState.params = { ...this.searchState.params, text: searchText, language, 'source-country': country, categories: category, 'earliest-publish-date': params['earliest-publish-date'], 'latest-publish-date': params['latest-publish-date'] };
            }
            this.searchState.params.offset = this.searchState.offset;

            const data = await this.makeApiRequest('/search-news', this.searchState.params);
            const items = data.news || [];
            this.renderSearchResults(items, { append: !reset });

            // Advance offset if we received a full page
            const received = items.length;
            if (received > 0) {
                this.searchState.offset += received;
            }
        } catch (error) {
            await window.electronAPI.showErrorDialog('Search Error', `Failed to search news: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    renderSearchResults(news, opts = { append: false }) {
        const container = document.getElementById('search-results');
        const append = !!opts.append;

        if (!news || news.length === 0) {
            if (!append) {
                container.innerHTML = `
                    <div class=\"empty-state\">
                        <i class=\"fas fa-search\"></i>
                        <h3>No news found</h3>
                        <p>Try adjusting your search criteria.</p>
                    </div>
                `;
            }
            // When appending and no new results, hide Load More
            const moreEl = document.getElementById('search-more');
            if (moreEl) moreEl.innerHTML = '';
            return;
        }

        const gridHtml = news.map(article => this.createNewsCard(article)).join('');
        if (!append) {
            container.innerHTML = `
                <div class=\"news-grid\" id=\"search-grid\">${gridHtml}</div>
                <div class=\"text-center mt-20\" id=\"search-more\"></div>
            `;
        } else {
            const grid = document.getElementById('search-grid');
            if (grid) grid.insertAdjacentHTML('beforeend', gridHtml);
        }

        // Show Load More button
        const moreEl = document.getElementById('search-more');
        if (moreEl) {
            moreEl.innerHTML = `<button class=\"btn btn-secondary\" id=\"load-more-search\"><i class=\"fas fa-plus\"></i> Load More</button>`;
            document.getElementById('load-more-search')?.addEventListener('click', () => this.performSearch(false));
        }

        // Add event listeners for news cards
        this.setupNewsCardListeners();
    }

    createNewsCard(article) {
        const isSaved = this.isNewsSaved(article.id);
        
        // Handle date formatting more robustly
        let formattedDate = 'Unknown date';
        if (article.publish_date) {
            try {
                const date = new Date(article.publish_date);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString();
                }
            } catch (error) {
                console.warn('Error formatting date:', article.publish_date, error);
            }
        }
        
        const countryName = this.countryCodeToName(article.source_country);

        return `
            <div class="news-card ${isSaved ? 'saved' : ''}" data-id="${article.id}">
                ${article.image ? `<img src="${article.image}" alt="${this.escapeHtml(article.title)}" class="news-card-image" onerror="this.style.display='none'">` : ''}
                <div class="news-card-content">
                    <h3 class="news-card-title">${this.escapeHtml(article.title)}</h3>
                    ${article.summary ? `<p class="news-card-summary">${this.escapeHtml(article.summary)}</p>` : ''}
                    <div class="news-card-meta">
                        <span>${formattedDate}</span>
                        <span>${countryName}</span>
                    </div>
                    <div class="news-card-actions">
                        <a href="${article.url}" target="_blank" class="btn btn-small">
                            <i class="fas fa-external-link-alt"></i>
                            ${this.getDomain(article.url)}
                        </a>
                        <div class="folder-selector">
                            <button class="btn btn-small save-news-btn" data-id="${article.id}">
                                <i class="fas fa-bookmark"></i>
                                ${isSaved ? 'Saved' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupNewsCardListeners() {
        document.querySelectorAll('.save-news-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const newsId = parseInt(e.currentTarget.getAttribute('data-id'));
                this.showFolderSelector(e.currentTarget, newsId);
            });
        });
    }

    showFolderSelector(button, newsId) {
        // Remove any existing dropdown
        document.querySelectorAll('.folder-dropdown').forEach(dropdown => {
            dropdown.remove();
        });

        const dropdown = document.createElement('div');
        dropdown.className = 'folder-dropdown';
        
        // Position relative to the page so it scrolls with the card but avoids clipping
        const rect = button.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        dropdown.style.left = (rect.left + window.scrollX) + 'px';
        dropdown.style.zIndex = '10000';
        
        const folders = this.settings.folders || [];
        if (folders.length === 0) {
            dropdown.innerHTML = `
                <div class="folder-dropdown-item" onclick="app.createFolderForNews(${newsId})">
                    <i class="fas fa-plus"></i> Create New Folder
                </div>
            `;
        } else {
            dropdown.innerHTML = folders.map(folder => `
                <div class="folder-dropdown-item" onclick="app.saveNewsToFolder(${newsId}, '${folder.id}')">
                    <i class="fas fa-folder"></i> ${this.escapeHtml(folder.name)}
                </div>
            `).join('') + `
                <div class="folder-dropdown-item" onclick="app.createFolderForNews(${newsId})">
                    <i class="fas fa-plus"></i> Create New Folder
                </div>
            `;
        }

        // Append to body instead of button parent to avoid clipping
        document.body.appendChild(dropdown);

        // Keep dropdown positioned near the button while scrolling/resizing
        const position = () => {
            const r = button.getBoundingClientRect();
            dropdown.style.top = (r.bottom + window.scrollY + 5) + 'px';
            dropdown.style.left = (r.left + window.scrollX) + 'px';
        };
        position();

        const scrollContainer = button.closest('.page');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', position);
        }
        // Capture scroll on any ancestor just in case
        document.addEventListener('scroll', position, true);
        window.addEventListener('resize', position);

        // Close dropdown when clicking outside and cleanup listeners
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
                document.removeEventListener('click', closeDropdown);
                if (scrollContainer) scrollContainer.removeEventListener('scroll', position);
                document.removeEventListener('scroll', position, true);
                window.removeEventListener('resize', position);
            }
        };
        
        // Add slight delay to prevent immediate closure
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 100);
    }

    async createFolderForNews(newsId) {
        const folderName = await this.showInputDialog('Create Folder', 'Enter folder name:');
        if (!folderName || !folderName.trim()) return;

        const folder = {
            id: Date.now().toString(),
            name: folderName.trim(),
            created: new Date().toISOString()
        };

        this.settings.folders.push(folder);
        await this.saveSettings();
        
        this.saveNewsToFolder(newsId, folder.id);
        this.renderFolders();
    }

    async saveNewsToFolder(newsId, folderId) {
        // Find the news article
        const newsCard = document.querySelector(`[data-id="${newsId}"]`);
        if (!newsCard) return;

        // Get news data from the card
        const title = newsCard.querySelector('.news-card-title').textContent;
        const summary = newsCard.querySelector('.news-card-summary')?.textContent || '';
        const url = newsCard.querySelector('a[href]').href;
        const image = newsCard.querySelector('.news-card-image')?.src || '';

        const newsData = {
            id: newsId,
            title,
            summary,
            url,
            image,
            savedAt: new Date().toISOString(),
            folderId
        };

        if (!this.settings.savedNews[folderId]) {
            this.settings.savedNews[folderId] = [];
        }

        // Check if already saved to this folder
        const existingIndex = this.settings.savedNews[folderId].findIndex(news => news.id === newsId);
        if (existingIndex === -1) {
            this.settings.savedNews[folderId].push(newsData);
            await this.saveSettings();
            
            // Update UI
            newsCard.classList.add('saved');
            const saveBtn = newsCard.querySelector('.save-news-btn');
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
        }

        // Remove dropdown
        document.querySelectorAll('.folder-dropdown').forEach(dropdown => {
            dropdown.remove();
        });
    }

    isNewsSaved(newsId) {
        const allSavedNews = Object.values(this.settings.savedNews || {}).flat();
        return allSavedNews.some(news => news.id === parseInt(newsId));
    }

    clearSearch() {
        document.getElementById('search-text').value = '';
        document.getElementById('search-language').value = '';
        document.getElementById('search-country').value = this.settings.preferences.defaultCountry;
        document.getElementById('search-category').value = '';
        document.getElementById('earliest-date').value = '';
        document.getElementById('latest-date').value = '';
        document.getElementById('search-results').innerHTML = '';
    }

    async saveCurrentSearch() {
        const searchText = document.getElementById('search-text').value.trim();
        const language = document.getElementById('search-language').value;
        const country = document.getElementById('search-country').value;
        const category = document.getElementById('search-category').value;
        const earliestDate = document.getElementById('earliest-date').value;
        const latestDate = document.getElementById('latest-date').value;

        // Suggest a name based on text or filters
        let suggested = searchText || '';
        const bits = [];
        if (language) bits.push(this.countryCodeToName(language) || language);
        if (country) bits.push(this.countryCodeToName(country) || country);
        if (category) bits.push(category);
        if (!suggested) suggested = bits.join(' • ');
        if (!suggested) suggested = 'Untitled Search';

        const name = await this.showInputDialog('Save Search', 'Enter a name for this search:', suggested);
        if (!name || !name.trim()) return;

        const searchData = {
            id: Date.now().toString(),
            name: name.trim(),
            text: searchText,
            language,
            country,
            category,
            earliestDate,
            latestDate,
            created: new Date().toISOString()
        };

        // Prevent duplicate names by appending a counter
        const base = searchData.name.trim();
        let finalName = base;
        let i = 2;
        const names = new Set((this.settings.savedSearches || []).map(s => s.name));
        while (names.has(finalName)) {
            finalName = `${base} (${i++})`;
        }
        searchData.name = finalName;

        if (!Array.isArray(this.settings.savedSearches)) this.settings.savedSearches = [];
        this.settings.savedSearches.push(searchData);
        await this.saveSettings();
        this.renderSavedSearches();
    }

    applyEarliestDatePreset() {
        const sel = document.getElementById('earliest-date-preset');
        const input = document.getElementById('earliest-date');
        if (!sel || !input) return;
        const today = new Date();
        let d = null;
        switch (sel.value) {
            case 'yesterday':
                d = new Date(today);
                d.setDate(today.getDate() - 1);
                break;
            case 'week':
                d = new Date(today);
                d.setDate(today.getDate() - 7);
                break;
            case 'month':
                d = new Date(today);
                d.setMonth(today.getMonth() - 1);
                break;
            case 'year':
                d = new Date(today.getFullYear(), 0, 1);
                break;
            default:
                return;
        }
        const iso = d.toISOString().split('T')[0];
        input.value = iso;
    }

    renderSavedSearches() {
        const container = document.getElementById('saved-searches-list');
        const searches = this.settings.savedSearches || [];

        if (searches.length === 0) {
            container.innerHTML = '<p style="color: #666;">No saved searches</p>';
            return;
        }

        container.innerHTML = searches.map(search => `
            <div class="saved-search-item">
                <div>
                    <h4>${this.escapeHtml(search.name)}</h4>
                    <p>"${this.escapeHtml(search.text)}"</p>
                </div>
                <div class="saved-search-actions">
                    <button class="btn btn-small" onclick="app.loadSavedSearch('${search.id}')">
                        <i class="fas fa-play"></i>
                        Run
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteSavedSearch('${search.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadSavedSearch(searchId) {
        const search = this.settings.savedSearches.find(s => s.id === searchId);
        if (!search) return;

        // Populate form
        document.getElementById('search-text').value = search.text;
        document.getElementById('search-language').value = search.language || '';
        document.getElementById('search-country').value = search.country || '';
        document.getElementById('search-category').value = search.category || '';
        document.getElementById('earliest-date').value = search.earliestDate || '';
        document.getElementById('latest-date').value = search.latestDate || '';

        // Perform search
    await this.performSearch(true);
    }

    async deleteSavedSearch(searchId) {
        const confirmed = await window.electronAPI.showMessageDialog({
            type: 'question',
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            message: 'Are you sure you want to delete this saved search?'
        });

        if (confirmed.response === 1) {
            this.settings.savedSearches = this.settings.savedSearches.filter(s => s.id !== searchId);
            await this.saveSettings();
            this.renderSavedSearches();
        }
    }

    async loadTopNews() {
        if (!this.settings.apiKey) {
            this.checkApiKey();
            return;
        }

        const country = document.getElementById('top-news-country').value;
        const language = document.getElementById('top-news-language').value;

        this.showLoading();

        try {
            const params = {
                'source-country': country,
                language: language,
                number: 20
            };

            const data = await this.makeApiRequest('/top-news', params);
            // Keep clusters; each cluster contains similar articles
            const clusters = (data.top_news || []).filter(c => Array.isArray(c.news) && c.news.length > 0);
            this.currentTopNewsClusters = clusters; // store for popover access
            this.renderTopNews(clusters);
        } catch (error) {
            await window.electronAPI.showErrorDialog('Error', `Failed to load top news: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    renderTopNews(clusters) {
        const container = document.getElementById('top-news-results');
        
        if (!clusters || clusters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <h3>No top news found</h3>
                    <p>Try selecting different country or language.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="news-grid">
                ${clusters.map((cluster, idx) => this.createClusterCard(cluster, idx)).join('')}
            </div>
        `;

        this.setupNewsCardListeners();
        this.setupClusterCardListeners();
    }

    createClusterCard(cluster, index) {
        const primary = cluster.news[0];
        const isSaved = this.isNewsSaved(primary.id);

        let formattedDate = 'Unknown date';
        if (primary.publish_date) {
            try {
                const date = new Date(primary.publish_date);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString();
                }
            } catch (_) {}
        }

        const countryName = this.countryCodeToName(primary.source_country);
        const moreCount = Math.max(0, (cluster.news?.length || 1) - 1);

        return `
            <div class="news-card ${isSaved ? 'saved' : ''}" data-id="${primary.id}" data-cluster-index="${index}">
                ${primary.image ? `<img src="${primary.image}" alt="${this.escapeHtml(primary.title)}" class="news-card-image" onerror="this.style.display='none'">` : ''}
                <div class="news-card-content">
                    <h3 class="news-card-title">${this.escapeHtml(primary.title)}</h3>
                    ${primary.summary ? `<p class="news-card-summary">${this.escapeHtml(primary.summary)}</p>` : ''}
                    <div class="news-card-meta">
                        <span>${formattedDate}</span>
                        <span>${countryName}</span>
                        ${moreCount > 0 ? `<span class="cluster-more-btn" data-cluster-index="${index}" style="color:#0d9aba;cursor:pointer;white-space:nowrap;">+ ${moreCount} more</span>` : ''}
                    </div>
                    <div class="news-card-actions">
                        <a href="${primary.url}" target="_blank" class="btn btn-small">
                            <i class="fas fa-external-link-alt"></i>
                            ${this.getDomain(primary.url)}
                        </a>
                        <div class="folder-selector">
                            <button class="btn btn-small save-news-btn" data-id="${primary.id}">
                                <i class="fas fa-bookmark"></i>
                                ${isSaved ? 'Saved' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupClusterCardListeners() {
        document.querySelectorAll('.cluster-more-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const idx = parseInt(e.currentTarget.getAttribute('data-cluster-index'));
                this.showClusterPopover(e.currentTarget, idx);
            });
        });
    }

    showClusterPopover(anchorEl, clusterIndex) {
        // Remove any existing popovers
        document.querySelectorAll('.cluster-popover').forEach(p => p.remove());

        const cluster = this.currentTopNewsClusters?.[clusterIndex];
        if (!cluster || !Array.isArray(cluster.news) || cluster.news.length <= 1) return;

        const others = cluster.news.slice(1);

        const pop = document.createElement('div');
        pop.className = 'cluster-popover';

        const itemsHtml = others.map(a => `
            <a class="cluster-popover-item" href="${a.url}" target="_blank">
                <div class="cluster-popover-title">${this.escapeHtml(a.title)}</div>
                <div class="cluster-popover-source">${this.getDomain(a.url)}</div>
            </a>
        `).join('');

        pop.innerHTML = itemsHtml || '<div class="cluster-popover-empty">No additional articles</div>';

        // Position near the anchor
        const rect = anchorEl.getBoundingClientRect();
        pop.style.position = 'absolute';
        pop.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        pop.style.left = (rect.left + window.scrollX) + 'px';
        pop.style.zIndex = '10000';

        document.body.appendChild(pop);

        const position = () => {
            const r = anchorEl.getBoundingClientRect();
            pop.style.top = (r.bottom + window.scrollY + 5) + 'px';
            pop.style.left = (r.left + window.scrollX) + 'px';
        };
        position();

        const scrollContainer = anchorEl.closest('.page');
        if (scrollContainer) scrollContainer.addEventListener('scroll', position);
        document.addEventListener('scroll', position, true);
        window.addEventListener('resize', position);

        const close = (e) => {
            if (!pop.contains(e.target) && e.target !== anchorEl) {
                if (pop.parentNode) pop.parentNode.removeChild(pop);
                document.removeEventListener('click', close);
                if (scrollContainer) scrollContainer.removeEventListener('scroll', position);
                document.removeEventListener('scroll', position, true);
                window.removeEventListener('resize', position);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 50);
    }

    async loadFrontPages() {
        if (!this.settings.apiKey) {
            this.checkApiKey();
            return;
        }

        const country = document.getElementById('front-pages-country').value;
        const sourceIdentifier = document.getElementById('front-pages-source')?.value || '';
    const date = document.getElementById('front-pages-date').value;

        this.showLoading();

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            // Clamp date to today if in the future or empty
            const theDate = (date && date <= todayStr) ? date : todayStr;

            // If no country chosen, show error (we rely on CSV to know sources per country)
            if (!country) {
                await window.electronAPI.showErrorDialog('Front Pages', 'Please select a country first.');
                return;
            }

            // Build list of source identifiers to query for chosen country
            const allForCountry = (this.frontPageSources?.sources || []).filter(s => s.countryCode.toLowerCase() === country.toLowerCase());
            let identifiers;
            if (sourceIdentifier) {
                identifiers = [sourceIdentifier];
            } else {
                identifiers = allForCountry.map(s => s.identifier);
            }

            if (!identifiers.length) {
                await window.electronAPI.showErrorDialog('Front Pages', 'No newspapers configured for this country.');
                return;
            }

            // Initialize pagination state and load first batch of 10
            this.frontPagesState = { country, date: theDate, identifiers, nextIndex: 0 };
            const batch = await this.fetchFrontPagesNextBatch();
            const hasMore = this.frontPagesState.nextIndex < this.frontPagesState.identifiers.length;

            // If empty, try a single country-level fallback
            let toRender = batch;
            if (toRender.length === 0) {
                try {
                    const data = await this.makeApiRequest('/retrieve-front-page', { 'source-country': country, date: theDate });
                    const fp = data?.front_page;
                    if (fp?.image) {
                        toRender = [{
                            url: fp.image,
                            source_name: fp.name || 'Unknown Source',
                            country: fp.country || country,
                            date: fp.date || theDate,
                            language: fp.language || ''
                        }];
                    }
                } catch (_) { /* ignore */ }
            }

            this.renderFrontPages(toRender, { append: false, showLoadMore: hasMore });
        } catch (error) {
            console.error('Front pages error:', error);
            
            let errorMessage = 'Failed to load front pages';
            
            if (error.message.includes('404')) {
                errorMessage = 'No front pages available for the selected country and date. Try a different country or date.';
            } else if (error.message.includes('Invalid API key')) {
                errorMessage = 'Invalid API key. Please check your settings.';
            } else {
                errorMessage = `Failed to load front pages: ${error.message}`;
            }
            
            await window.electronAPI.showErrorDialog('Error', errorMessage);
        } finally {
            this.hideLoading();
        }
    }

    async fetchFrontPagesNextBatch() {
        if (!this.frontPagesState) return [];
        const { country, date, identifiers } = this.frontPagesState;
        const pageSize = 10; // number of successful results desired per batch
        const concurrency = 6;
        const results = [];

        const runOne = async (id) => {
            try {
                const params = { 'source-name': id, date };
                const data = await this.makeApiRequest('/retrieve-front-page', params);
                const fp = data?.front_page;
                if (!fp || !fp.image) return null;
                return {
                    url: fp.image,
                    source_name: fp.name || id,
                    country: fp.country || country,
                    date: fp.date || date,
                    language: fp.language || '',
                };
            } catch (err) {
                // 400s or others mean no page available; ignore and continue
                console.log(`Front page error for ${id}:`, err?.message || err);
                return null;
            }
        };

        // Keep fetching until we have pageSize successes or run out of identifiers
        while (this.frontPagesState.nextIndex < identifiers.length && results.length < pageSize) {
            const start = this.frontPagesState.nextIndex;
            const part = identifiers.slice(start, start + concurrency);
            this.frontPagesState.nextIndex = start + part.length; // advance by attempted count

            const settled = await Promise.allSettled(part.map(runOne));
            settled.forEach(s => { if (s.status === 'fulfilled' && s.value) results.push(s.value); });
        }

        return results;
    }

    renderFrontPages(frontPages, opts = { append: false, showLoadMore: false }) {
        const container = document.getElementById('front-pages-results');
        const append = !!opts.append;
        const showLoadMore = !!opts.showLoadMore;

        if (!frontPages || frontPages.length === 0) {
            if (append) {
                // Don't clear existing content when appending with no new items
                const moreEl = document.getElementById('front-pages-more');
                if (moreEl) moreEl.innerHTML = '';
                return;
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-newspaper"></i>
                        <h3>No front pages found</h3>
                        <p>Try selecting a different country or date. Note that front pages may not be available for all countries and dates.</p>
                    </div>
                `;
                return;
            }
        }

        const gridHtml = (items) => `
            ${items.map(page => {
                const imageUrl = page.url || page.image || page.front_page_url || '';
                const sourceName = page.source_name || page.name || page.sourceName || page.source || 'Unknown Source';
                const country = page.country ? ` (${page.country.toUpperCase()})` : '';
                const date = page.date ? ` - ${page.date}` : '';
                return `
                    <div class="front-page-card">
                        ${imageUrl ? `
                            <img src="${imageUrl}" 
                                 alt="${this.escapeHtml(sourceName)}" 
                                 class="front-page-image" 
                                 onerror="this.style.display='none'"
                                 loading="lazy">
                        ` : `
                            <div class="front-page-placeholder">
                                <i class="fas fa-newspaper"></i>
                                <p>Image not available</p>
                            </div>
                        `}
                        <div class="front-page-title">
                            ${this.escapeHtml(sourceName)}${country}${date}
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        if (!append) {
            container.innerHTML = `
                <div class="front-pages-grid" id="front-pages-grid">
                    ${gridHtml(frontPages)}
                </div>
                <div class="text-center mt-20" id="front-pages-more"></div>
            `;
        } else {
            const grid = document.getElementById('front-pages-grid');
            if (grid) grid.insertAdjacentHTML('beforeend', gridHtml(frontPages));
        }

        const moreEl = document.getElementById('front-pages-more');
        if (moreEl) {
            if (showLoadMore) {
                moreEl.innerHTML = `<button class="btn btn-secondary" id="load-front-pages-more-btn"><i class="fas fa-plus"></i> Load More</button>`;
                document.getElementById('load-front-pages-more-btn')?.addEventListener('click', () => this.loadFrontPagesMore());
            } else {
                moreEl.innerHTML = '';
            }
        }
    }

    async loadFrontPagesMore() {
        if (!this.frontPagesState) return;
        this.showLoading();
        try {
            const batch = await this.fetchFrontPagesNextBatch();
            const hasMore = this.frontPagesState.nextIndex < this.frontPagesState.identifiers.length;
            this.renderFrontPages(batch, { append: true, showLoadMore: hasMore });
        } catch (e) {
            await window.electronAPI.showErrorDialog('Error', `Failed to load more: ${e?.message || e}`);
        } finally {
            this.hideLoading();
        }
    }

    showInputDialog(title, message, defaultValue = '') {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            // Create modal dialog
            const modal = document.createElement('div');
            modal.className = 'input-modal';
            modal.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 400px;
                width: 90%;
            `;

            modal.innerHTML = `
                <h3 style="margin-top: 0;">${title}</h3>
                <p>${message}</p>
                <input type="text" id="modal-input" value="${defaultValue}" 
                       style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                <div style="text-align: right; margin-top: 15px;">
                    <button id="modal-cancel" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="modal-ok" style="padding: 8px 16px; border: none; background: #007acc; color: white; border-radius: 4px; cursor: pointer;">OK</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const input = modal.querySelector('#modal-input');
            const okBtn = modal.querySelector('#modal-ok');
            const cancelBtn = modal.querySelector('#modal-cancel');

            // Focus input and select text
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);

            function close(result) {
                document.body.removeChild(overlay);
                resolve(result);
            }

            // Event listeners
            okBtn.addEventListener('click', () => close(input.value));
            cancelBtn.addEventListener('click', () => close(null));
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') close(input.value);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(null);
            });

            // Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escapeHandler);
                    close(null);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    }

    async createFolder() {
        const folderName = await this.showInputDialog('Create Folder', 'Enter folder name:');
        if (!folderName || !folderName.trim()) return;

        const folder = {
            id: Date.now().toString(),
            name: folderName.trim(),
            created: new Date().toISOString()
        };

        this.settings.folders.push(folder);
        await this.saveSettings();
        this.renderFolders();
    }

    renderFolders() {
        const container = document.getElementById('folders-list');
        const folders = this.settings.folders || [];

        if (folders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder"></i>
                    <h3>No folders created</h3>
                    <p>Create folders to organize your saved news articles.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="folders-grid">
                ${folders.map(folder => {
                    const newsCount = (this.settings.savedNews[folder.id] || []).length;
                    return `
                        <div class="folder-card" onclick="app.openFolder('${folder.id}')">
                            <div class="folder-icon">
                                <i class="fas fa-folder"></i>
                            </div>
                            <div class="folder-name">${this.escapeHtml(folder.name)}</div>
                            <div class="folder-count">${newsCount} articles</div>
                            <div class="folder-actions" onclick="event.stopPropagation()">
                                <button class="btn btn-small btn-danger" onclick="app.deleteFolder('${folder.id}')">
                                    <i class="fas fa-trash"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    openFolder(folderId) {
        const folder = this.settings.folders.find(f => f.id === folderId);
        if (!folder) return;

        const savedNews = this.settings.savedNews[folderId] || [];
        
        // Switch to saved news page and show folder contents
        this.switchPage('saved');
        this.renderFolderNews(folder, savedNews);
    }

    renderFolderNews(folder, news) {
        const container = document.getElementById('saved-news-results');
        
        container.innerHTML = `
            <div class="page-header">
                <h3>
                    <button class="btn btn-secondary" onclick="app.renderSavedNews()" style="margin-right: 15px;">
                        <i class="fas fa-arrow-left"></i>
                        Back
                    </button>
                    ${this.escapeHtml(folder.name)}
                </h3>
            </div>
            ${news.length === 0 ? `
                <div class="empty-state">
                    <i class="fas fa-bookmark"></i>
                    <h3>No saved articles</h3>
                    <p>Articles you save to this folder will appear here.</p>
                </div>
            ` : `
                <div class="news-grid">
                    ${news.map(article => this.createSavedNewsCard(article, folder.id)).join('')}
                </div>
            `}
        `;
    }

    renderSavedNews() {
        const container = document.getElementById('saved-news-results');
        const allSavedNews = Object.values(this.settings.savedNews || {}).flat();
        
        if (allSavedNews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bookmark"></i>
                    <h3>No saved articles</h3>
                    <p>Save interesting articles to access them later.</p>
                </div>
            `;
            return;
        }

        // Group by folder
        const groupedNews = {};
        this.settings.folders.forEach(folder => {
            const folderNews = this.settings.savedNews[folder.id] || [];
            if (folderNews.length > 0) {
                groupedNews[folder.name] = { folder, news: folderNews };
            }
        });

        container.innerHTML = Object.entries(groupedNews).map(([folderName, data]) => `
            <div class="folder-section">
                <h3 class="folder-section-title" onclick="app.openFolder('${data.folder.id}')" style="cursor: pointer;">
                    <i class="fas fa-folder"></i>
                    ${this.escapeHtml(folderName)} (${data.news.length})
                    <i class="fas fa-chevron-right" style="float: right; margin-top: 5px;"></i>
                </h3>
                <div class="news-grid">
                    ${data.news.slice(0, 3).map(article => this.createSavedNewsCard(article, data.folder.id)).join('')}
                </div>
            </div>
        `).join('');
    }

    createSavedNewsCard(article, folderId) {
        const formattedDate = new Date(article.savedAt).toLocaleDateString();
        
        return `
            <div class="news-card saved" data-id="${article.id}">
                ${article.image ? `<img src="${article.image}" alt="${article.title}" class="news-card-image" onerror="this.style.display='none'">` : ''}
                <div class="news-card-content">
                    <h3 class="news-card-title">${this.escapeHtml(article.title)}</h3>
                    ${article.summary ? `<p class="news-card-summary">${this.escapeHtml(article.summary)}</p>` : ''}
                    <div class="news-card-meta">
                        <span>Saved: ${formattedDate}</span>
                    </div>
                    <div class="news-card-actions">
                        <a href="${article.url}" target="_blank" class="btn btn-small">
                            <i class="fas fa-external-link-alt"></i>
                            ${this.getDomain(article.url)}
                        </a>
                        <button class="btn btn-small btn-danger" onclick="app.removeSavedNews('${article.id}', '${folderId}')">
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async removeSavedNews(newsId, folderId) {
        const confirmed = await window.electronAPI.showMessageDialog({
            type: 'question',
            buttons: ['Cancel', 'Remove'],
            defaultId: 0,
            message: 'Are you sure you want to remove this article?'
        });

        if (confirmed.response === 1) {
            this.settings.savedNews[folderId] = this.settings.savedNews[folderId].filter(
                news => news.id !== parseInt(newsId)
            );
            await this.saveSettings();
            
            // Refresh current view
            if (this.currentPage === 'saved') {
                this.renderSavedNews();
            }
        }
    }

    async deleteFolder(folderId) {
        const folder = this.settings.folders.find(f => f.id === folderId);
        const newsCount = (this.settings.savedNews[folderId] || []).length;
        
        const confirmed = await window.electronAPI.showMessageDialog({
            type: 'question',
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            message: `Are you sure you want to delete "${folder.name}"? This will also delete ${newsCount} saved articles.`
        });

        if (confirmed.response === 1) {
            // Remove folder and its news
            this.settings.folders = this.settings.folders.filter(f => f.id !== folderId);
            delete this.settings.savedNews[folderId];
            
            await this.saveSettings();
            this.renderFolders();
        }
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NewsroomApp();
});
