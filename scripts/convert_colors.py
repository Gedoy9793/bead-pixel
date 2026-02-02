#!/usr/bin/env python3
"""
拼豆颜色转换脚本
从 RSC (React Server Components) 流式数据中提取颜色信息，
并生成 TypeScript 格式的颜色库文件。

支持的品牌：Perler, Hama, Artkal, MARD, Nabbi, Ikea
"""

import re
import os
import json
from pathlib import Path
from typing import Dict, List, NamedTuple
from urllib.parse import unquote

try:
    import ftfy
    HAS_FTFY = True
except ImportError:
    HAS_FTFY = False
    print("警告: 未安装 ftfy 库，某些中文字符可能无法正确解码")
    print("安装命令: pip install ftfy")


class BeadColor(NamedTuple):
    """拼豆颜色数据结构"""
    id: str
    name: str
    code: str
    hex: str
    r: int
    g: int
    b: int


# 品牌配置：品牌名称 -> (文件名, ID前缀, 输出名称, 源数据中的品牌标识)
# 源数据中的品牌标识可能与品牌名称不同（如 Artkal-S）
BRAND_CONFIG = {
    'Perler': ('perler', 'P', 'Perler', 'Perler'),
    'Hama': ('hama', 'H', 'Hama', 'Hama'),
    'Artkal': ('artkal', 'A', 'Artkal', 'Artkal-S'),  # 源数据中使用 Artkal-S
    'MARD': ('mard', 'M', 'MARD', 'MARD'),
    'Nabbi': ('nabbi', 'N', 'Nabbi', 'Nabbi'),
    'Ikea': ('ikea', 'I', 'Ikea Pyssla', 'Ikea'),
}


def hex_to_rgb(hex_color: str) -> Dict[str, int]:
    """将 HEX 颜色值转换为 RGB"""
    hex_color = hex_color.lstrip('#')
    return {
        'r': int(hex_color[0:2], 16),
        'g': int(hex_color[2:4], 16),
        'b': int(hex_color[4:6], 16)
    }


def decode_utf8_escapes(text: str) -> str:
    """
    修复编码错误的文本（mojibake 修复）
    
    源数据中的中文经历了多次错误编码，使用 ftfy 库可以自动修复。
    如果 ftfy 不可用，则尝试常见的编码转换方法。
    """
    # 首选方法: 使用 ftfy 自动修复
    if HAS_FTFY:
        return ftfy.fix_text(text)
    
    # 备选方法: 手动尝试编码转换
    try:
        # 将 mojibake 文本编码为 cp1252 字节，然后解码为 UTF-8
        decoded = text.encode('cp1252').decode('utf-8')
        return decoded
    except (UnicodeDecodeError, UnicodeEncodeError):
        try:
            # 尝试 latin-1 编码
            decoded = text.encode('latin-1').decode('utf-8')
            return decoded
        except (UnicodeDecodeError, UnicodeEncodeError):
            try:
                return unquote(text, encoding='utf-8')
            except Exception:
                return text


def extract_colors_from_rsc(content: str, source_brand_name: str, id_prefix: str) -> List[BeadColor]:
    """
    从 RSC 数据中提取颜色信息
    
    RSC 数据格式示例:
    ["$","div","Perler:P01",{..."style":{"backgroundColor":"#F1F1F1"}..."children":"白色"...}]
    
    Args:
        content: RSC 数据内容
        source_brand_name: 源数据中的品牌标识（可能与输出品牌名不同，如 Artkal-S）
        id_prefix: 输出颜色ID的前缀
    """
    colors = []
    seen_codes = set()  # 用于去重
    
    # 正则表达式匹配颜色数据块
    # 匹配模式: ["$","div","Brand:Code",{...}]
    # 需要提取: Brand:Code, backgroundColor, children (颜色名称)
    
    # 模式 1: 标准格式 - key 在第三个位置
    pattern = r'\["\$","div","' + re.escape(source_brand_name) + r':([^"]+)".*?"backgroundColor":"(#[0-9A-Fa-f]{6})".*?"children":"([^"]+)"'
    
    matches = re.finditer(pattern, content)
    
    for match in matches:
        code = match.group(1)
        hex_color = match.group(2).upper()
        raw_name = match.group(3)
        
        # 解码颜色名称
        name = decode_utf8_escapes(raw_name)
        
        # 跳过重复的颜色代码
        if code in seen_codes:
            continue
        seen_codes.add(code)
        
        # 生成颜色 ID
        # 如果 code 已经以品牌前缀开头，直接使用；否则添加前缀
        if code.startswith(id_prefix) or (id_prefix == 'A' and code.startswith('S')):
            # Perler 的 P01, Hama 的 H01, Nabbi 的 N01, MARD 的 M001, Artkal 的 S01
            color_id = code
        else:
            # Ikea 使用英文名称如 Black, Blue
            color_id = f"{id_prefix}-{code}"
        
        # 转换 HEX 到 RGB
        rgb = hex_to_rgb(hex_color)
        
        colors.append(BeadColor(
            id=color_id,
            name=name,
            code=code,
            hex=hex_color,
            r=rgb['r'],
            g=rgb['g'],
            b=rgb['b']
        ))
    
    return colors


def read_brand_file(colors_dir: Path, filename: str) -> str:
    """读取品牌源数据文件"""
    file_path = colors_dir / filename
    if not file_path.exists():
        raise FileNotFoundError(f"找不到文件: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()


def generate_typescript_array(colors: List[BeadColor], indent: int = 2) -> str:
    """生成 TypeScript 颜色数组代码"""
    lines = []
    prefix = ' ' * indent
    
    for color in colors:
        line = (
            f"{prefix}{{ id: '{color.id}', name: '{color.name}', "
            f"code: '{color.code}', hex: '{color.hex}', "
            f"rgb: {{ r: {color.r}, g: {color.g}, b: {color.b} }} }},"
        )
        lines.append(line)
    
    return '\n'.join(lines)


def generate_beadcolors_ts(all_colors: Dict[str, List[BeadColor]]) -> str:
    """生成完整的 beadColors.ts 文件内容"""
    
    output = '''import { BeadColor, BeadColorLibrary, BeadBrand } from '../types';

// 透明色（所有品牌通用）
export const TRANSPARENT_COLOR: BeadColor = {
  id: 'transparent',
  name: '透明 / 擦除',
  code: 'CLEAR',
  hex: 'transparent',
  rgb: { r: 0, g: 0, b: 0 },
};

'''
    
    # 按品牌生成颜色数组
    brand_var_names = {}
    for brand_name, (filename, id_prefix, display_name, source_brand) in BRAND_CONFIG.items():
        colors = all_colors.get(brand_name, [])
        var_name = f"{brand_name.lower()}Colors"
        brand_var_names[brand_name] = var_name
        
        output += f"// {display_name} 品牌色库 ({len(colors)} 色)\n"
        output += f"const {var_name}: BeadColor[] = [\n"
        output += generate_typescript_array(colors)
        output += "\n];\n\n"
    
    # 生成颜色库映射
    output += '''// 颜色库映射
export const beadColorLibraries: Record<BeadBrand, BeadColorLibrary> = {
'''
    
    for brand_name, (filename, id_prefix, display_name, source_brand) in BRAND_CONFIG.items():
        var_name = brand_var_names[brand_name]
        brand_key = brand_name.lower()
        output += f"  {brand_key}: {{\n"
        output += f"    brand: '{brand_key}',\n"
        output += f"    name: '{display_name}',\n"
        output += f"    colors: {var_name},\n"
        output += f"  }},\n"
    
    output += '''};\n
// 获取指定品牌的颜色库
export function getColorLibrary(brand: BeadBrand): BeadColorLibrary {
  return beadColorLibraries[brand];
}

// 获取所有颜色库（数组形式，用于遍历）
export function getColorLibraries(): BeadColorLibrary[] {
  return Object.values(beadColorLibraries);
}

// 获取所有颜色（可按品牌过滤，始终包含透明色）
export function getAllColors(brand?: BeadBrand): BeadColor[] {
  const brandColors = brand 
    ? beadColorLibraries[brand]?.colors || []
    : Object.values(beadColorLibraries).flatMap(lib => lib.colors);
  
  // 在颜色列表开头添加透明色
  return [TRANSPARENT_COLOR, ...brandColors];
}

// 根据颜色ID查找颜色
export function findColorById(id: string, brand?: BeadBrand): BeadColor | undefined {
  // 检查是否是透明色
  if (id === 'transparent') {
    return TRANSPARENT_COLOR;
  }
  if (brand) {
    return beadColorLibraries[brand].colors.find(c => c.id === id);
  }
  return Object.values(beadColorLibraries).flatMap(lib => lib.colors).find(c => c.id === id);
}

// 根据品牌和颜色ID查找颜色（兼容旧API）
export function getColorById(brand: BeadBrand, id: string): BeadColor | undefined {
  // 检查是否是透明色
  if (id === 'transparent') {
    return TRANSPARENT_COLOR;
  }
  return beadColorLibraries[brand]?.colors.find(c => c.id === id);
}

// 默认配置
export const defaultConfig = {
  width: 29,
  height: 29,
  colorCount: 16,
  brand: 'perler' as BeadBrand,
  lockAspectRatio: true,
};
'''
    
    return output


def main():
    """主函数"""
    # 确定路径
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    colors_dir = project_dir.parent / 'colors'
    output_file = project_dir / 'src' / 'data' / 'beadColors.ts'
    
    print(f"源数据目录: {colors_dir}")
    print(f"输出文件: {output_file}")
    print()
    
    # 提取所有品牌的颜色
    all_colors: Dict[str, List[BeadColor]] = {}
    total_colors = 0
    
    for brand_name, (filename, id_prefix, display_name, source_brand) in BRAND_CONFIG.items():
        print(f"处理 {display_name}...")
        try:
            content = read_brand_file(colors_dir, filename)
            colors = extract_colors_from_rsc(content, source_brand, id_prefix)
            all_colors[brand_name] = colors
            total_colors += len(colors)
            print(f"  ✓ 提取了 {len(colors)} 种颜色")
        except FileNotFoundError as e:
            print(f"  ✗ {e}")
            all_colors[brand_name] = []
        except Exception as e:
            print(f"  ✗ 处理失败: {e}")
            all_colors[brand_name] = []
    
    print()
    print(f"总计提取 {total_colors} 种颜色")
    print()
    
    # 生成 TypeScript 文件
    print(f"生成 TypeScript 文件...")
    ts_content = generate_beadcolors_ts(all_colors)
    
    # 确保输出目录存在
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    
    print(f"✓ 已写入: {output_file}")
    
    # 输出颜色统计
    print()
    print("=" * 50)
    print("颜色统计:")
    print("=" * 50)
    for brand_name, (filename, id_prefix, display_name, source_brand) in BRAND_CONFIG.items():
        colors = all_colors.get(brand_name, [])
        print(f"  {display_name}: {len(colors)} 色")
    print("-" * 50)
    print(f"  总计: {total_colors} 色")


if __name__ == '__main__':
    main()
