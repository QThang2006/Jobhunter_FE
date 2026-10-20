import { IPermission } from '@/types/backend';
import { grey, green, blue, red, orange } from '@ant-design/colors';
import groupBy from 'lodash/groupBy';
import map from 'lodash/map';

export const SKILLS_LIST = [
    { label: "Bắt bông kem & Chà láng", value: "DECOR_CREAM" },
    { label: "Tạo hình Fondant", value: "FONDANT" },
    { label: "Bánh mì men tự nhiên (Sourdough)", value: "SOURDOUGH" },
    { label: "Bánh lạnh (Mousse, Tiramisu)", value: "PASTRY_COLD" },
    { label: "Vận hành lò nướng đối lưu", value: "BAKING_OVEN" },
    { label: "Thu ngân & Phần mềm POS", value: "CASHIER_POS" },
    { label: "Pha chế Cafe / Barista cơ bản", value: "BARISTA_BASIC" },
    { label: "Vệ sinh An toàn Thực phẩm (ATTP)", value: "FOOD_SAFETY" },
    { label: "Quản lý nguyên liệu & Kho bánh", value: "INVENTORY" }
];

export const LOCATION_LIST = [
    { label: "Đà Nẵng", value: "DANANG" },
    { label: "TP. Hồ Chí Minh", value: "HOCHIMINH" },
    { label: "Hà Nội", value: "HANOI" },
    { label: "Khu vực khác", value: "OTHER" },
];

export const nonAccentVietnamese = (str: string) => {
    str = str.replace(/A|Á|À|Ã|Ạ|Â|Ấ|Ầ|Ẫ|Ậ|Ă|Ắ|Ằ|Ẵ|Ặ/g, "A");
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/E|É|È|Ẽ|Ẹ|Ê|Ế|Ề|Ễ|Ệ/, "E");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/I|Í|Ì|Ĩ|Ị/g, "I");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/O|Ó|Ò|Õ|Ọ|Ô|Ố|Ồ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ỡ|Ợ/g, "O");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/U|Ú|Ù|Ũ|Ụ|Ư|Ứ|Ừ|Ữ|Ự/g, "U");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/Y|Ý|Ỳ|Ỹ|Ỵ/g, "Y");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/đ/g, "d");
    // Combining accents
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    return str;
};

export const convertSlug = (str: string) => {
    str = nonAccentVietnamese(str);
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
};

export const getLocationName = (value: string) => {
    if (!value) return 'Chưa cập nhật địa chỉ';
    const locationFilter = LOCATION_LIST.filter(item => item.value === value);
    if (locationFilter.length) return locationFilter[0].label;
    // Nếu là địa chỉ chi tiết do người tuyển dụng nhập tự do thì trả về nguyên chuỗi đó
    return value;
};

export function colorMethod(method: "POST" | "PUT" | "GET" | "DELETE" | string) {
    switch (method) {
        case "POST":
            return green[6];
        case "PUT":
            return orange[6];
        case "GET":
            return blue[6];
        case "DELETE":
            return red[6];
        default:
            return grey[10];
    }
}

export const groupByPermission = (data: any[]): { module: string; permissions: IPermission[] }[] => {
    const groupedData = groupBy(data, x => x.module);
    return map(groupedData, (value, key) => {
        return { module: key, permissions: value as IPermission[] };
    });
};
