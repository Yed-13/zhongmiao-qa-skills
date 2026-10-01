#!/usr/bin/env python3
"""读共同问题汇总表（.xlsx），连同每行的底色一起输出。

为什么要自己读：排除规则靠颜色（例如“蓝底行”），只导出文字会丢掉这个信息；
而很多机器没有 openpyxl。本脚本只用标准库。

用法：
  python3 read_issue_sheet.py 表格.xlsx                 # 全部工作表、全部行
  python3 read_issue_sheet.py 表格.xlsx --code A01 B02  # 只看这几个编号
  python3 read_issue_sheet.py 表格.xlsx --sheet 共同问题汇总 --json

输出里每行带两个标记：
  fill=FFDDEBF7  该行第一列（编号列）的直接填充色
  [蓝底]         按色相判断为浅蓝/蓝色填充（大多数表用它表示“另有安排/排除”，
                 具体含义以表头说明为准，脚本只报颜色不下结论）
注意：脚本读的是“直接填充色”。若工作表有条件格式，会额外提示，需要在表格软件里核对实际显示。
"""
import argparse
import colorsys
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {
    'm': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
T = '{%s}t' % NS['m']


def load(zf, name):
    try:
        return ET.fromstring(zf.read(name))
    except KeyError:
        return None


def shared_strings(zf):
    root = load(zf, 'xl/sharedStrings.xml')
    if root is None:
        return []
    return [''.join(x.text or '' for x in si.iter(T)) for si in root.findall('m:si', NS)]


def styles(zf):
    root = load(zf, 'xl/styles.xml')
    fills, xfs = [], []
    if root is None:
        return fills, xfs
    for f in root.find('m:fills', NS).findall('m:fill', NS):
        pf = f.find('m:patternFill', NS)
        if pf is None or pf.get('patternType') in (None, 'none'):
            fills.append(None)
            continue
        fg = pf.find('m:fgColor', NS)
        fills.append(dict(fg.attrib) if fg is not None else {'pattern': pf.get('patternType')})
    for x in root.find('m:cellXfs', NS).findall('m:xf', NS):
        xfs.append(int(x.get('fillId', 0)))
    return fills, xfs


def is_blue(fill):
    rgb = (fill or {}).get('rgb')
    if not rgb or len(rgb) < 6:
        return False
    r, g, b = (int(rgb[-6:][i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    # 只认浅蓝（表头常用深蓝底白字，不算“蓝底行”）
    return 0.50 <= h <= 0.70 and 0.05 <= s <= 0.60 and v >= 0.80


def col_letters(ref):
    return re.match(r'[A-Z]+', ref).group(0)


def read_sheets(path):
    zf = zipfile.ZipFile(path)
    ss = shared_strings(zf)
    fills, xfs = styles(zf)
    wb = load(zf, 'xl/workbook.xml')
    rels = load(zf, 'xl/_rels/workbook.xml.rels')
    rmap = {r.get('Id'): r.get('Target') for r in rels}
    out = []
    for s in wb.find('m:sheets', NS):
        target = rmap[s.get('{%s}id' % NS['r'])].lstrip('/')
        target = target if target.startswith('xl/') else 'xl/' + target
        sh = load(zf, target)
        rows = []
        for row in sh.find('m:sheetData', NS):
            cells = {}
            row_fill = None
            for c in row:
                v, inline = c.find('m:v', NS), c.find('m:is', NS)
                if c.get('t') == 's' and v is not None:
                    val = ss[int(v.text)]
                elif inline is not None:
                    val = ''.join(x.text or '' for x in inline.iter(T))
                else:
                    val = v.text if v is not None else None
                fill = fills[xfs[int(c.get('s', 0))]] if xfs else None
                col = col_letters(c.get('r'))
                if col == 'A':
                    row_fill = fill
                if val not in (None, ''):
                    cells[col] = str(val).replace('\n', ' / ')
            if cells:
                rows.append({'row': int(row.get('r')), 'cells': cells, 'fill': row_fill,
                             'blue': is_blue(row_fill)})
        out.append({'sheet': s.get('name'),
                    'conditionalFormatting': len(sh.findall('m:conditionalFormatting', NS)),
                    'rows': rows})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('xlsx')
    ap.add_argument('--code', nargs='*', help='只输出编号列等于这些值的行，例如 A01 B02')
    ap.add_argument('--sheet', help='只读这个工作表')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    data = read_sheets(a.xlsx)
    if a.sheet:
        data = [d for d in data if d['sheet'] == a.sheet]
    if a.code:
        want = {c.upper() for c in a.code}
        for d in data:
            d['rows'] = [r for r in d['rows'] if str(r['cells'].get('A', '')).upper() in want]
    if a.json:
        json.dump(data, sys.stdout, ensure_ascii=False, indent=1)
        return
    for d in data:
        print(f"=== 工作表：{d['sheet']}（{len(d['rows'])} 行）")
        if d['conditionalFormatting']:
            print(f"  ⚠ 有 {d['conditionalFormatting']} 段条件格式：实际显示颜色可能与下面的直接填充色不同，请在表格软件里核对")
        for r in d['rows']:
            fill = (r['fill'] or {}).get('rgb', '-') if r['fill'] else '-'
            tag = ' [蓝底]' if r['blue'] else ''
            body = ' | '.join(f"{k}={v}" for k, v in r['cells'].items())
            print(f"  行{r['row']} fill={fill}{tag} :: {body}")
    missing = set(c.upper() for c in (a.code or [])) - {
        str(r['cells'].get('A', '')).upper() for d in data for r in d['rows']}
    if missing:
        print(f"⚠ 没找到这些编号：{', '.join(sorted(missing))}（编号是任务编号，不是单元格地址；检查是否在别的工作表）")


if __name__ == '__main__':
    main()
