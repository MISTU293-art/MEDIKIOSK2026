/**
 * MediKiosk Universal Table Paginator & Live Search Engine
 * Automatically paginates any table with live search and responsive page controls
 */
function initTablePagination(tableId, paginationContainerId, arg3, arg4) {
  const table = document.getElementById(tableId);
  const container = document.getElementById(paginationContainerId);
  if (!table || !container) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  // Flexible argument handling: (tableId, containerId, itemsPerPage) or (tableId, containerId, searchInputId, itemsPerPage)
  let searchInputId = null;
  let itemsPerPage = 8;

  if (typeof arg3 === 'string') {
    searchInputId = arg3;
    itemsPerPage = typeof arg4 === 'number' ? arg4 : 8;
  } else if (typeof arg3 === 'number') {
    itemsPerPage = arg3;
    if (typeof arg4 === 'string') searchInputId = arg4;
  }

  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (rows.length === 0 || (rows.length === 1 && rows[0].querySelector('td[colspan]'))) {
    container.innerHTML = '';
    return;
  }

  let currentPage = 1;
  let pageSize = itemsPerPage;
  let filteredRows = [...rows];

  function render() {
    const totalItems = filteredRows.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;

    rows.forEach(r => r.style.display = 'none');
    filteredRows.slice(startIdx, endIdx).forEach(r => r.style.display = '');

    const startItem = totalItems === 0 ? 0 : startIdx + 1;
    const endItem = Math.min(endIdx, totalItems);

    let html = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100 py-1">
        <div class="text-muted small">
          Showing <strong>${startItem}</strong> to <strong>${endItem}</strong> of <strong>${totalItems}</strong> entries
        </div>
        <div class="d-flex align-items-center gap-2">
          <nav>
            <ul class="pagination pagination-sm m-0">
              <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button type="button" class="page-link rounded-start-pill px-3" onclick="changePage('${tableId}', ${currentPage - 1})">
                  <i class="bi bi-chevron-left"></i> Prev
                </button>
              </li>`;

    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
        if (p === 2 || p === totalPages - 1) {
          html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        continue;
      }
      html += `
        <li class="page-item ${p === currentPage ? 'active' : ''}">
          <button type="button" class="page-link ${p === currentPage ? 'fw-bold' : ''}" onclick="changePage('${tableId}', ${p})">${p}</button>
        </li>`;
    }

    html += `
              <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button type="button" class="page-link rounded-end-pill px-3" onclick="changePage('${tableId}', ${currentPage + 1})">
                  Next <i class="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>`;

    container.innerHTML = html;
  }

  const paginator = {
    setPage: (p) => { currentPage = p; render(); },
    filter: (searchTerm) => {
      const q = (searchTerm || '').toLowerCase().trim();
      filteredRows = rows.filter(r => r.innerText.toLowerCase().includes(q));
      currentPage = 1;
      render();
    }
  };

  window[`paginate_${tableId}`] = paginator;

  if (searchInputId) {
    const input = document.getElementById(searchInputId);
    if (input) {
      input.addEventListener('input', (e) => {
        paginator.filter(e.target.value);
      });
    }
  }

  render();
}

function changePage(tableId, p) {
  if (window[`paginate_${tableId}`]) {
    window[`paginate_${tableId}`].setPage(p);
  }
}

function filterTable(tableId, searchInputId) {
  const input = document.getElementById(searchInputId);
  if (input && window[`paginate_${tableId}`]) {
    window[`paginate_${tableId}`].filter(input.value);
  }
}
