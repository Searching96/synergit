# Frontend Issues & Refactoring Plan

Tài liệu này theo dõi các vấn đề về cấu trúc mã nguồn của Frontend và tiến độ tái cấu trúc (refactor) để tuân thủ các quy chuẩn trong `FRONTEND.md`.

## Danh sách Issues hiện tại

### 1. `App.tsx` God Object
- **Mô tả:** File `App.tsx` có dung lượng quá lớn (> 1000 lines) và ôm đồm quá nhiều chức năng (quản lý state, xử lý logic routing, fetch dữ liệu, render layout).
- **Tác hại:** Khó đọc, khó maintain, dễ gây conflict khi nhiều người cùng làm việc, component re-render toàn bộ app khi một state nhỏ thay đổi.
- **Giải pháp:** Tách `App.tsx` thành các Route components, chuyển logic fetch data ra các custom hooks, và chuyển state dùng chung vào Context.

### 2. Prop Drilling & Thiếu Global State
- **Mô tả:** Các state như `isAuthenticated`, `repos`, `selectedRepoId`, `branches`, và thông tin user đang được lưu tại `App.tsx` và truyền tay (prop drill) xuống hàng chục components con.
- **Tác hại:** Gây "ô nhiễm" tham số của các component trung gian (những component không xài data nhưng vẫn phải nhận props để truyền tiếp).
- **Giải pháp:** Thiết lập React Context (ví dụ `AuthContext`, `RepositoryContext`) để quản lý global state.

### 3. Custom Routing mong manh
- **Mô tả:** Frontend hiện đang tự build các hàm parse URL thủ công (ví dụ `parseAppPath`) và dùng state `viewMode`, `activeTab` để render có điều kiện các giao diện.
- **Tác hại:** Không hỗ trợ tốt trình duyệt (Back/Forward button có thể gặp lỗi), không tận dụng được code-splitting, URL không linh hoạt.
- **Giải pháp:** Sử dụng `react-router-dom` v6 để quản lý routing chuẩn.

### 4. Thiếu cấu trúc thư mục rõ ràng
- **Mô tả:** Gần như mọi thứ đang nhồi nhét vào trong `src/components/`, không phân biệt rõ ràng đâu là Page level component, đâu là reusable component, đâu là feature module.
- **Giải pháp:** Tổ chức lại thư mục theo chuẩn: `pages/`, `features/`, `contexts/`, `hooks/`.

---

## Kế hoạch Refactor (Changelog & ToDo)

### Phase 1: Standard Routing (React Router)
- `[x]` Cài đặt package `react-router-dom`.
- `[x]` Tạo file `routes.tsx` hoặc định nghĩa BrowserRouter.
- `[x]` Thay thế custom path parsing bằng `<Route>` và `useParams()`.
- `[x]` Thay thế các thẻ `<a>` và hàm chuyển trang thủ công bằng `<Link>` và `useNavigate()`.

### Phase 2: Global State Management (Context)
- `[x]` Tạo `AuthContext.tsx` để quản lý `isAuthenticated` và thông tin User.
- `[x]` Tạo `RepositoryContext.tsx` để quản lý `repos`, `selectedRepo`, `branches`, `currentBranch`.
- `[x]` Bọc ứng dụng (hoặc `<Routes>`) bằng các Provider này.
- `[x]` Xóa state từ `App.tsx` và sử dụng hook context (`useAuth`, `useRepository`).

### Phase 3: Custom Hooks & Data Fetching
- `[x]` Tạo thư mục `src/hooks/`.
- `[x]` Chuyển các logic gọi API (reposApi.getRepos, reposApi.getRepoCount, hydratePrimaryLanguages) thành các custom hooks, ví dụ: `useRepositories()`, `useRepoBranches()`.
- `[x]` (Tùy chọn) Sử dụng React Query (`@tanstack/react-query`) hoặc SWR để quản lý caching, loading state, error state thay vì dùng nhiều `useEffect` và state rời rạc. (Quyết định: Dùng custom hooks để đơn giản hóa context thay vì cài thêm thư viện vì đây là app nội bộ, hooks tự viết đủ đáp ứng).

### Phase 4: Reorganize Directory Structure
- `[x]` Khởi tạo thư mục `src/pages/` và di chuyển các component đóng vai trò là màn hình (VD: `CreateRepositoryPage.tsx`, màn hình Workspace, màn hình Profile) vào đây.
- `[x]` Khởi tạo thư mục `src/layouts/` chứa các thành phần dùng chung như `SidebarMenu`, `TopHeader`, `TopNavigationTabs`.
- `[x]` Phân tách và dọn dẹp các utils còn lại từ `components` sang `utils` (ví dụ `repoTabs.ts`, `profileUtils.ts`). và cấu hình Routes.
