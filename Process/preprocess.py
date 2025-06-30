import os
import json

# Đường dẫn tới thư mục chứa các file json
json_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Crawl', 'Crawl')

all_data = []
for filename in os.listdir(json_dir):
    if filename.endswith('.json'):
        file_path = os.path.join(json_dir, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                all_data.append(data)
            except Exception as e:
                print(f"Lỗi đọc {filename}: {e}")

# Xử lý dữ liệu: ví dụ loại bỏ bản ghi thiếu trường 'name'
clean_data = [item for item in all_data if 'name' in item]

print("Dữ liệu đã xử lý:", clean_data)