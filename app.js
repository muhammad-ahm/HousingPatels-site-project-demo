// ===================================================
// Housing Patel — App controller
// Drives: properties.html, property-detail.html, add-property.html,
// admin.html, my-listings.html, my-favorites.html, my-inquiries.html,
// and the admin-link visibility on dashboard.html.
// ===================================================

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

function formatPrice(price) {
    const num = Number(price);
    if (isNaN(num)) return price;
    return 'PKR ' + num.toLocaleString();
}

function starString(rating) {
    if (!rating) return 'No ratings yet';
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full) + ` (${rating})`;
}

async function apiFetch(url, options = {}) {
    const opts = {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        ...options,
    };
    if (options.headers) opts.headers = { ...opts.headers, ...options.headers };
    const response = await fetch(url, opts);
    let body = {};
    try { body = await response.json(); } catch { /* no body */ }
    return { ok: response.ok, status: response.status, body };
}

function propertyCardHtml(p) {
    const img = p.image_url || './img/HP.png';
    return `
        <a class="property-card" href="./property-detail.html?id=${p.id}">
            <img src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}">
            <div class="property-card-body">
                <h3>${escapeHtml(p.title)}</h3>
                <div class="property-price">${formatPrice(p.price)}</div>
                <div class="property-meta">${escapeHtml(p.city)} · ${escapeHtml(p.property_type)}${p.bedrooms ? ' · ' + p.bedrooms + ' bed' : ''}</div>
            </div>
        </a>`;
}

document.addEventListener('DOMContentLoaded', function () {

    // ===================================================
    // dashboard.html — show Admin link only for admins
    // ===================================================
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        apiFetch('/auth/me').then(({ ok, body }) => {
            if (ok && body.role === 'admin') adminLink.style.display = 'inline-block';
        });
    }

    // ===================================================
    // properties.html — browse/search/filter
    // ===================================================
    const propertyGrid = document.getElementById('propertyGrid');
    if (propertyGrid) {
        const filterForm = document.getElementById('filterForm');
        const resultsInfo = document.getElementById('resultsInfo');
        const paginationEl = document.getElementById('pagination');
        let currentPage = 1;

        async function loadProperties(page = 1) {
            currentPage = page;
            const params = new URLSearchParams();
            const city = document.getElementById('fCity').value.trim();
            const type = document.getElementById('fType').value;
            const minPrice = document.getElementById('fMinPrice').value;
            const maxPrice = document.getElementById('fMaxPrice').value;
            const bedrooms = document.getElementById('fBedrooms').value;
            const sort = document.getElementById('fSort').value;

            if (city) params.set('city', city);
            if (type) params.set('type', type);
            if (minPrice) params.set('minPrice', minPrice);
            if (maxPrice) params.set('maxPrice', maxPrice);
            if (bedrooms) params.set('bedrooms', bedrooms);
            if (sort) params.set('sort', sort);
            params.set('page', page);

            propertyGrid.innerHTML = '<p>Loading…</p>';
            const { ok, body } = await apiFetch('/properties?' + params.toString());

            if (!ok) {
                propertyGrid.innerHTML = `<p class="empty-state">${escapeHtml(body.error || 'Could not load properties.')}</p>`;
                return;
            }

            if (body.properties.length === 0) {
                propertyGrid.innerHTML = '<p class="empty-state">No properties match your search.</p>';
                resultsInfo.textContent = '';
                paginationEl.innerHTML = '';
                return;
            }

            propertyGrid.innerHTML = body.properties.map(propertyCardHtml).join('');
            resultsInfo.textContent = `${body.pagination.total} propert${body.pagination.total === 1 ? 'y' : 'ies'} found`;

            paginationEl.innerHTML = '';
            for (let i = 1; i <= body.pagination.totalPages; i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                if (i === body.pagination.page) btn.classList.add('active');
                btn.addEventListener('click', () => loadProperties(i));
                paginationEl.appendChild(btn);
            }
        }

        filterForm.addEventListener('submit', function (e) {
            e.preventDefault();
            loadProperties(1);
        });

        loadProperties(1);
    }

    // ===================================================
    // property-detail.html
    // ===================================================
    const detailRoot = document.getElementById('detailRoot');
    if (detailRoot) {
        const propertyId = new URLSearchParams(window.location.search).get('id');

        async function loadDetail() {
            if (!propertyId) {
                detailRoot.innerHTML = '<p class="empty-state">No property specified.</p>';
                return;
            }

            const { ok, body } = await apiFetch('/properties/' + propertyId);
            if (!ok) {
                detailRoot.innerHTML = `<p class="empty-state">${escapeHtml(body.error || 'Property not found.')}</p>`;
                return;
            }

            const p = body.property;
            const me = await apiFetch('/auth/me');
            const isLoggedIn = me.ok;

            detailRoot.innerHTML = `
                <div class="detail-hero">
                    <img src="${escapeHtml(p.image_url || './img/HP.png')}" alt="${escapeHtml(p.title)}">
                </div>
                <div class="detail-header">
                    <div>
                        <h2>${escapeHtml(p.title)}</h2>
                        <div class="property-price">${formatPrice(p.price)}</div>
                        <div class="property-meta">${escapeHtml(p.city)}${p.address ? ' · ' + escapeHtml(p.address) : ''} · ${escapeHtml(p.property_type)}</div>
                        <div class="property-meta">${p.bedrooms ? p.bedrooms + ' bed' : ''} ${p.bathrooms ? '· ' + p.bathrooms + ' bath' : ''} ${p.area_sqft ? '· ' + p.area_sqft + ' sqft' : ''}</div>
                        <span class="status-pill status-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span>
                    </div>
                    <div class="star-rating">${starString(body.averageRating)} ${body.reviewCount ? `· ${body.reviewCount} review${body.reviewCount === 1 ? '' : 's'}` : ''}</div>
                </div>
                <p>${escapeHtml(p.description || 'No description provided.')}</p>

                <div class="action-row" id="actionRow"></div>

                <div id="inquiryArea"></div>

                <h3>Reviews</h3>
                <div id="reviewsArea"></div>
                <div id="reviewFormArea"></div>
            `;

            const actionRow = document.getElementById('actionRow');
            if (isLoggedIn) {
                const favBtn = document.createElement('button');
                favBtn.className = 'btn-secondary';
                favBtn.textContent = '♥ Save to Favorites';
                favBtn.addEventListener('click', async function () {
                    const res = await apiFetch('/favorites', { method: 'POST', body: JSON.stringify({ propertyId: p.id }) });
                    if (res.ok) {
                        favBtn.textContent = '✓ Saved';
                        favBtn.classList.add('active');
                    }
                });
                actionRow.appendChild(favBtn);
            } else {
                const loginPrompt = document.createElement('a');
                loginPrompt.className = 'btn-outline btn-secondary';
                loginPrompt.href = './login.html';
                loginPrompt.textContent = 'Log in to save or contact';
                actionRow.appendChild(loginPrompt);
            }

            // Inquiry form (only if logged in and not the owner)
            const inquiryArea = document.getElementById('inquiryArea');
            if (isLoggedIn && me.body.userId !== p.owner_id) {
                inquiryArea.innerHTML = `
                    <h3>Contact about this property</h3>
                    <div class="form-message form-error" id="inquiryError"></div>
                    <div class="form-message form-success" id="inquirySuccess"></div>
                    <textarea id="inquiryMessage" rows="3" placeholder="I'm interested in this property..." style="width:100%; max-width: 30rem;"></textarea>
                    <br><br>
                    <button class="btn-primary" id="sendInquiryBtn">Send Inquiry</button>
                `;
                document.getElementById('sendInquiryBtn').addEventListener('click', async function () {
                    const message = document.getElementById('inquiryMessage').value.trim();
                    const errEl = document.getElementById('inquiryError');
                    const okEl = document.getElementById('inquirySuccess');
                    errEl.style.display = 'none';
                    okEl.style.display = 'none';
                    if (!message) {
                        errEl.textContent = 'Please write a message first.';
                        errEl.style.display = 'block';
                        return;
                    }
                    const res = await apiFetch('/inquiries', { method: 'POST', body: JSON.stringify({ propertyId: p.id, message }) });
                    if (res.ok) {
                        okEl.textContent = 'Inquiry sent!';
                        okEl.style.display = 'block';
                        document.getElementById('inquiryMessage').value = '';
                    } else {
                        errEl.textContent = res.body.error || 'Could not send inquiry.';
                        errEl.style.display = 'block';
                    }
                });
            }

            // Reviews list
            const reviewsArea = document.getElementById('reviewsArea');
            if (body.reviews.length === 0) {
                reviewsArea.innerHTML = '<p class="empty-state">No reviews yet.</p>';
            } else {
                reviewsArea.innerHTML = body.reviews.map(r => `
                    <div class="review-item">
                        <span class="reviewer-name">${escapeHtml(r.reviewer_name)}</span> — ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                        <p>${escapeHtml(r.comment || '')}</p>
                    </div>
                `).join('');
            }

            // Review submission form (logged-in users only)
            const reviewFormArea = document.getElementById('reviewFormArea');
            if (isLoggedIn) {
                reviewFormArea.innerHTML = `
                    <h4>Leave a review</h4>
                    <select id="reviewRating">
                        <option value="5">★★★★★ (5)</option>
                        <option value="4">★★★★☆ (4)</option>
                        <option value="3">★★★☆☆ (3)</option>
                        <option value="2">★★☆☆☆ (2)</option>
                        <option value="1">★☆☆☆☆ (1)</option>
                    </select>
                    <br><br>
                    <textarea id="reviewComment" rows="2" placeholder="Your thoughts..." style="width:100%; max-width: 30rem;"></textarea>
                    <br><br>
                    <button class="btn-primary" id="submitReviewBtn">Submit Review</button>
                    <div class="form-message form-success" id="reviewSuccess"></div>
                `;
                document.getElementById('submitReviewBtn').addEventListener('click', async function () {
                    const rating = document.getElementById('reviewRating').value;
                    const comment = document.getElementById('reviewComment').value.trim();
                    const res = await apiFetch('/reviews', { method: 'POST', body: JSON.stringify({ propertyId: p.id, rating, comment }) });
                    const successEl = document.getElementById('reviewSuccess');
                    if (res.ok) {
                        successEl.textContent = 'Thanks for your review!';
                        successEl.style.display = 'block';
                        setTimeout(() => window.location.reload(), 1000);
                    }
                });
            }
        }

        loadDetail();
    }

    // ===================================================
    // add-property.html
    // ===================================================
    const propertyForm = document.getElementById('propertyForm');
    if (propertyForm) {
        propertyForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            const errEl = document.getElementById('formError');
            const okEl = document.getElementById('formSuccess');

            const payload = {
                title: document.getElementById('title').value.trim(),
                propertyType: document.getElementById('propertyType').value,
                price: Number(document.getElementById('price').value),
                city: document.getElementById('city').value.trim(),
                address: document.getElementById('address').value.trim() || null,
                bedrooms: Number(document.getElementById('bedrooms').value) || null,
                bathrooms: Number(document.getElementById('bathrooms').value) || null,
                areaSqft: Number(document.getElementById('areaSqft').value) || null,
                imageUrl: document.getElementById('imageUrl').value.trim() || null,
                description: document.getElementById('description').value.trim() || null,
            };

            submitBtn.disabled = true;
            const { ok, body } = await apiFetch('/properties', { method: 'POST', body: JSON.stringify(payload) });
            submitBtn.disabled = false;

            if (!ok) {
                errEl.textContent = body.error || 'Something went wrong.';
                errEl.style.display = 'block';
                okEl.style.display = 'none';
                return;
            }

            okEl.textContent = 'Listing created! Redirecting…';
            okEl.style.display = 'block';
            errEl.style.display = 'none';
            setTimeout(() => { window.location.href = './property-detail.html?id=' + body.id; }, 800);
        });
    }

    // ===================================================
    // my-listings.html
    // ===================================================
    const myListingsRoot = document.getElementById('myListingsRoot');
    if (myListingsRoot) {
        (async function () {
            const { ok, body } = await apiFetch('/my/properties');
            if (!ok) {
                window.location.href = './login.html';
                return;
            }
            if (body.properties.length === 0) {
                myListingsRoot.innerHTML = '<h2>My Listings</h2><p class="empty-state">You haven\'t listed any properties yet. <a href="./add-property.html">List one now</a>.</p>';
                return;
            }
            myListingsRoot.innerHTML = '<h2>My Listings</h2><div class="property-grid">' +
                body.properties.map(p => `
                    <div class="property-card">
                        <img src="${escapeHtml(p.image_url || './img/HP.png')}" alt="${escapeHtml(p.title)}">
                        <div class="property-card-body">
                            <h3>${escapeHtml(p.title)}</h3>
                            <div class="property-price">${formatPrice(p.price)}</div>
                            <span class="status-pill status-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span>
                            <div style="margin-top:0.5rem;">
                                <a href="./property-detail.html?id=${p.id}">View</a>
                            </div>
                        </div>
                    </div>
                `).join('') + '</div>';
        })();
    }

    // ===================================================
    // my-favorites.html
    // ===================================================
    const myFavoritesRoot = document.getElementById('myFavoritesRoot');
    if (myFavoritesRoot) {
        (async function () {
            const { ok, body } = await apiFetch('/favorites');
            if (!ok) {
                window.location.href = './login.html';
                return;
            }
            if (body.favorites.length === 0) {
                myFavoritesRoot.innerHTML = '<h2>My Favorites</h2><p class="empty-state">No saved properties yet. <a href="./properties.html">Browse listings</a>.</p>';
                return;
            }
            myFavoritesRoot.innerHTML = '<h2>My Favorites</h2><div class="property-grid">' +
                body.favorites.map(propertyCardHtml).join('') + '</div>';
        })();
    }

    // ===================================================
    // my-inquiries.html
    // ===================================================
    const myInquiriesRoot = document.getElementById('myInquiriesRoot');
    if (myInquiriesRoot) {
        (async function () {
            const { ok, body } = await apiFetch('/inquiries');
            if (!ok) {
                window.location.href = './login.html';
                return;
            }

            const sentHtml = body.sent.length === 0
                ? '<p class="empty-state">You haven\'t sent any inquiries yet.</p>'
                : `<table class="data-table"><tr><th>Property</th><th>Message</th><th>Status</th><th>Sent</th></tr>` +
                  body.sent.map(i => `<tr>
                      <td><a href="./property-detail.html?id=${i.property_id}">${escapeHtml(i.property_title)}</a></td>
                      <td>${escapeHtml(i.message)}</td>
                      <td><span class="status-pill status-${escapeHtml(i.status)}">${escapeHtml(i.status)}</span></td>
                      <td>${new Date(i.created_at).toLocaleDateString()}</td>
                  </tr>`).join('') + '</table>';

            const receivedHtml = body.received.length === 0
                ? '<p class="empty-state">No one has inquired about your listings yet.</p>'
                : `<table class="data-table"><tr><th>Property</th><th>From</th><th>Message</th><th>Status</th><th>Action</th></tr>` +
                  body.received.map(i => `<tr>
                      <td><a href="./property-detail.html?id=${i.property_id}">${escapeHtml(i.property_title)}</a></td>
                      <td>${escapeHtml(i.from_name)} (${escapeHtml(i.from_email)})</td>
                      <td>${escapeHtml(i.message)}</td>
                      <td><span class="status-pill status-${escapeHtml(i.status)}">${escapeHtml(i.status)}</span></td>
                      <td><button class="mark-contacted-btn" data-id="${i.id}">Mark Contacted</button></td>
                  </tr>`).join('') + '</table>';

            myInquiriesRoot.innerHTML = `
                <h2>Inquiries I Sent</h2>${sentHtml}
                <h2 style="margin-top:2rem;">Inquiries I Received</h2>${receivedHtml}
            `;

            document.querySelectorAll('.mark-contacted-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    await apiFetch('/inquiries/' + btn.dataset.id, { method: 'PUT', body: JSON.stringify({ status: 'contacted' }) });
                    window.location.reload();
                });
            });
        })();
    }

    // ===================================================
    // admin.html
    // ===================================================
    const adminRoot = document.getElementById('adminRoot');
    if (adminRoot) {
        (async function () {
            const { ok, status, body } = await apiFetch('/admin/overview');
            if (!ok) {
                if (status === 403) {
                    adminRoot.innerHTML = '<p class="empty-state">Admin access only.</p>';
                } else {
                    window.location.href = './login.html';
                }
                return;
            }

            const usersHtml = `<table class="data-table"><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr>` +
                body.users.map(u => `<tr>
                    <td>${escapeHtml(u.name)}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${escapeHtml(u.role)}</td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                    <td><button class="toggle-role-btn" data-id="${u.id}" data-role="${u.role === 'admin' ? 'user' : 'admin'}">
                        Make ${u.role === 'admin' ? 'User' : 'Admin'}
                    </button></td>
                </tr>`).join('') + '</table>';

            const propertiesHtml = `<table class="data-table"><tr><th>Title</th><th>Owner</th><th>Price</th><th>City</th><th>Status</th></tr>` +
                body.properties.map(p => `<tr>
                    <td><a href="./property-detail.html?id=${p.id}">${escapeHtml(p.title)}</a></td>
                    <td>${escapeHtml(p.owner_name)}</td>
                    <td>${formatPrice(p.price)}</td>
                    <td>${escapeHtml(p.city)}</td>
                    <td><span class="status-pill status-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
                </tr>`).join('') + '</table>';

            adminRoot.innerHTML = `
                <h2>Admin — Users (${body.users.length})</h2>${usersHtml}
                <h2 style="margin-top:2rem;">Admin — Properties (${body.properties.length})</h2>${propertiesHtml}
            `;

            document.querySelectorAll('.toggle-role-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    await apiFetch('/admin/users/' + btn.dataset.id + '/role', {
                        method: 'PUT',
                        body: JSON.stringify({ role: btn.dataset.role }),
                    });
                    window.location.reload();
                });
            });
        })();
    }
});
