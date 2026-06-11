# Frontend Development & Refactoring Guidelines

Tài liệu này định nghĩa các best practices, conventions, và kế hoạch tái cấu trúc (refactor) cho codebase frontend của Synergit. 

## 1. Phân tích hiện trạng (The "Mess")
Dựa trên source code hiện tại, frontend đang gặp phải một số vấn đề lớn về mặt tổ chức, cụ thể:
- **God Object `App.tsx`:** File `App.tsx` quá lớn (> 1000 lines), ôm đồm quá nhiều trách nhiệm (responsibilities) từ việc quản lý global state (auth, repos, branches, tabs), custom routing (phân tích URL thủ công), cho đến layout rendering.
- **Prop Drilling:** Do không có Global State Management (`contexts` hay thư viện quản lý state), các state và hàm setState phải truyền tay (prop drill) qua rất nhiều component con, làm cho code khó bảo trì và dễ sinh lỗi.
- **Thiếu Routing Library:** Việc parse path thủ công (ví dụ `parseAppPath`) rất mong manh và không tận dụng được các tính năng tối ưu của các routing libraries tiêu chuẩn.
- **Business Logic & UI Mixed:** Việc gọi API, xử lý data, và quản lý side effects nằm chung với logic render UI trong các component, vi phạm nguyên tắc Single Responsibility.

## 2. Best Practices & Conventions
Để duy trì và phát triển tính năng mới một cách dễ dàng, frontend cần tuân thủ các quy tắc sau:

### 2.1. Cấu trúc thư mục (Directory Structure)
Tách biệt rõ ràng các tầng logic thay vì dồn hết vào `components`:
- `src/pages/`: Chứa các component ở mức cao nhất (route level), đại diện cho các màn hình (ví dụ: `ProfilePage.tsx`, `RepositoryWorkspacePage.tsx`).
- `src/features/`: Gom nhóm các components, hooks, và utils theo tính năng (ví dụ: `features/auth`, `features/pull-requests`). *Feature-based architecture* giúp code scale tốt hơn so với gom tất cả components vào chung 1 nơi.
- `src/contexts/` (hoặc thư viện state): Chứa global state.
- `src/hooks/`: Custom hooks để tái sử dụng logic (đặc biệt là logic fetch data).
- `src/components/shared/`: Các reusable UI components (Button, Modal, Input).

### 2.2. Routing
- Bắt buộc sử dụng một thư viện routing chuẩn (khuyến nghị **React Router DOM v6**).
- Khai báo routes tĩnh hoặc động trong một file cấu hình riêng (`routes.tsx`), sử dụng Layout routes để wrap các phần giao diện dùng chung (như Sidebar, TopHeader).

### 2.3. State Management
- **Server State (API Data):** Nên dùng các custom hooks để quản lý việc gọi API (ví dụ: `useAuth`, `useRepository`), lý tưởng nhất là sử dụng **TanStack Query (React Query)** để quản lý caching, loading, và error states tự động.
- **Client State (Global UI State):** Dùng React Context (như `AuthContext`, `RepoContext`) hoặc thư viện nhẹ như **Zustand** để lưu trạng thái user đăng nhập hoặc repo đang chọn, tránh prop drilling.
- **Local State:** Chỉ dùng `useState` cho những state chỉ liên quan đến bản thân component đó (ví dụ: text input, toggle modal).

### 2.4. Component Conventions
- Tách biệt "Smart" components (quản lý state/data fetch) và "Dumb" components (chỉ nhận props và render UI).
- Đưa các hàm tiện ích phức tạp (utility functions) ra ngoài component file để dễ viết unit test.

## 3. Kế hoạch sửa chữa (Refactoring Plan)

Quá trình refactor `App.tsx` và cấu trúc hiện tại sẽ được chia thành các Phase rõ ràng để đảm bảo không làm gãy các tính năng hiện có:

### Phase 1: Áp dụng Standard Routing
- Cài đặt `react-router-dom`.
- Chuyển đổi các logic phân tích URL thủ công (`parseAppPath`) thành các `<Route>` định nghĩa rõ ràng.
- Tách `App.tsx` thành các Route element nhỏ gọn.
- Áp dụng cơ chế Nested Routes cho Repository Workspace (để tách tab files, commits, pulls, issues...).

### Phase 2: Áp dụng Global State (Context)
- Tạo `AuthContext` để cung cấp `isAuthenticated` và thông tin User hiện tại xuống toàn bộ app.
- Tạo `RepositoryContext` để chia sẻ `selectedRepoId`, `branches`, `currentBranch`, giúp loại bỏ hàng tá props truyền qua các component của Repository Workspace.

### Phase 3: Tách Business Logic vào Custom Hooks (Data Fetching)
- Gom các lời gọi API từ `services/api.ts` vào các custom hooks (ví dụ: `useFetchRepos()`, `useRepoDetails()`).
- Di chuyển các state liên quan đến loading/error vào trong hook, giữ cho component render giao diện một cách sạch sẽ.

### Phase 4: Tổ chức lại thư mục
- Di chuyển các "Page" thực sự từ thư mục `components/` sang `pages/` (ví dụ `CreateRepositoryPage.tsx`).
- Nhóm các component liên quan chặt chẽ thành các feature modules trong `features/`.

Mục tiêu cấp thiết hiện tại là phải làm sạch được tổ chức mã nguồn frontend để dọn đường cho việc hoàn thiện core monolithic theo như trong `DOCUMENT.md`.
