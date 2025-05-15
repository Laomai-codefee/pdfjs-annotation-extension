import Icon from '@ant-design/icons'
import type { GetProps } from 'antd'
import React from 'react'

type CustomIconComponentProps = GetProps<typeof Icon>

const SelectSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 320 512">
        <path
            fill="currentColor"
            d="M0 55.2V426c0 12.2 9.9 22 22 22c6.3 0 12.4-2.7 16.6-7.5L121.2 346l58.1 116.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9L179.8 320H297.9c12.2 0 22.1-9.9 22.1-22.1c0-6.3-2.7-12.3-7.4-16.5L38.6 37.9C34.3 34.1 28.9 32 23.2 32C10.4 32 0 42.4 0 55.2z"
        ></path>
    </svg>
)

const HighlightSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 576 512">
        <path
            fill="currentColor"
            d="M315 315l158.4-215L444.1 70.6 229 229 315 315zm-187 5l0 0V248.3c0-15.3 7.2-29.6 19.5-38.6L420.6 8.4C428 2.9 437 0 446.2 0c11.4 0 22.4 4.5 30.5 12.6l54.8 54.8c8.1 8.1 12.6 19 12.6 30.5c0 9.2-2.9 18.2-8.4 25.6L334.4 396.5c-9 12.3-23.4 19.5-38.6 19.5H224l-25.4 25.4c-12.5 12.5-32.8 12.5-45.3 0l-50.7-50.7c-12.5-12.5-12.5-32.8 0-45.3L128 320zM7 466.3l63-63 70.6 70.6-31 31c-4.5 4.5-10.6 7-17 7H24c-13.3 0-24-10.7-24-24v-4.7c0-6.4 2.5-12.5 7-17z"
        ></path>
    </svg>
)

const StrikeoutSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 512 512">
        <path
            fill="currentColor"
            d="M161.3 144c3.2-17.2 14-30.1 33.7-38.6c21.1-9 51.8-12.3 88.6-6.5c11.9 1.9 48.8 9.1 60.1 12c17.1 4.5 34.6-5.6 39.2-22.7s-5.6-34.6-22.7-39.2c-14.3-3.8-53.6-11.4-66.6-13.4c-44.7-7-88.3-4.2-123.7 10.9c-36.5 15.6-64.4 44.8-71.8 87.3c-.1 .6-.2 1.1-.2 1.7c-2.8 23.9 .5 45.6 10.1 64.6c4.5 9 10.2 16.9 16.7 23.9H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H270.1c-.1 0-.3-.1-.4-.1l-1.1-.3c-36-10.8-65.2-19.6-85.2-33.1c-9.3-6.3-15-12.6-18.2-19.1c-3.1-6.1-5.2-14.6-3.8-27.4zM348.9 337.2c2.7 6.5 4.4 15.8 1.9 30.1c-3 17.6-13.8 30.8-33.9 39.4c-21.1 9-51.7 12.3-88.5 6.5c-18-2.9-49.1-13.5-74.4-22.1c-5.6-1.9-11-3.7-15.9-5.4c-16.8-5.6-34.9 3.5-40.5 20.3s3.5 34.9 20.3 40.5c3.6 1.2 7.9 2.7 12.7 4.3l0 0 0 0c24.9 8.5 63.6 21.7 87.6 25.6l0 0 .2 0c44.7 7 88.3 4.2 123.7-10.9c36.5-15.6 64.4-44.8 71.8-87.3c3.6-21 2.7-40.4-3.1-58.1H335.1c7 5.6 11.4 11.2 13.9 17.2z"
        ></path>
    </svg>
)

const UnderlineSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 448 512">
        <path
            fill="currentColor"
            d="M16 64c0-17.7 14.3-32 32-32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H128V224c0 53 43 96 96 96s96-43 96-96V96H304c-17.7 0-32-14.3-32-32s14.3-32 32-32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H384V224c0 88.4-71.6 160-160 160s-160-71.6-160-160V96H48C30.3 96 16 81.7 16 64zM0 448c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z"
        ></path>
    </svg>
)

const FreetextSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 384 512">
        <path
            fill="currentColor"
            d="M32 32C14.3 32 0 46.3 0 64S14.3 96 32 96H160V448c0 17.7 14.3 32 32 32s32-14.3 32-32V96H352c17.7 0 32-14.3 32-32s-14.3-32-32-32H192 32z"
        ></path>
    </svg>
)

const RectangleSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 512 512">
        <path
            fill="currentColor"
            d="M384 80c8.8 0 16 7.2 16 16V416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16H384zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"
        ></path>
    </svg>
)

const EllipseSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 512 512">
        <path fill="currentColor" d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"></path>
    </svg>
)

const FreehandSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 512 512">
        <path
            fill="currentColor"
            d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"
        ></path>
    </svg>
)

const FreeHighlightSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 576 512">
        <path
            fill="currentColor"
            d="M315 315l158.4-215L444.1 70.6 229 229 315 315zm-187 5l0 0V248.3c0-15.3 7.2-29.6 19.5-38.6L420.6 8.4C428 2.9 437 0 446.2 0c11.4 0 22.4 4.5 30.5 12.6l54.8 54.8c8.1 8.1 12.6 19 12.6 30.5c0 9.2-2.9 18.2-8.4 25.6L334.4 396.5c-9 12.3-23.4 19.5-38.6 19.5H224l-25.4 25.4c-12.5 12.5-32.8 12.5-45.3 0l-50.7-50.7c-12.5-12.5-12.5-32.8 0-45.3L128 320zM7 466.3l63-63 70.6 70.6-31 31c-4.5 4.5-10.6 7-17 7H24c-13.3 0-24-10.7-24-24v-4.7c0-6.4 2.5-12.5 7-17z"
        ></path>
    </svg>
)

const SignatureSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 640 512">
        <path
            fill="currentColor"
            d="M192 128c0-17.7 14.3-32 32-32s32 14.3 32 32v7.8c0 27.7-2.4 55.3-7.1 82.5l-84.4 25.3c-40.6 12.2-68.4 49.6-68.4 92v71.9c0 40 32.5 72.5 72.5 72.5c26 0 50-13.9 62.9-36.5l13.9-24.3c26.8-47 46.5-97.7 58.4-150.5l94.4-28.3-12.5 37.5c-3.3 9.8-1.6 20.5 4.4 28.8s15.7 13.3 26 13.3H544c17.7 0 32-14.3 32-32s-14.3-32-32-32H460.4l18-53.9c3.8-11.3 .9-23.8-7.4-32.4s-20.7-11.8-32.2-8.4L316.4 198.1c2.4-20.7 3.6-41.4 3.6-62.3V128c0-53-43-96-96-96s-96 43-96 96v32c0 17.7 14.3 32 32 32s32-14.3 32-32V128zm-9.2 177l49-14.7c-10.4 33.8-24.5 66.4-42.1 97.2l-13.9 24.3c-1.5 2.6-4.3 4.3-7.4 4.3c-4.7 0-8.5-3.8-8.5-8.5V335.6c0-14.1 9.3-26.6 22.8-30.7zM24 368c-13.3 0-24 10.7-24 24s10.7 24 24 24H64.3c-.2-2.8-.3-5.6-.3-8.5V368H24zm592 48c13.3 0 24-10.7 24-24s-10.7-24-24-24H305.9c-6.7 16.3-14.2 32.3-22.3 48H616z"
        ></path>
    </svg>
)

const StampSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 512 512">
        <path
            fill="currentColor"
            d="M312 201.8c0-17.4 9.2-33.2 19.9-47C344.5 138.5 352 118.1 352 96c0-53-43-96-96-96s-96 43-96 96c0 22.1 7.5 42.5 20.1 58.8c10.7 13.8 19.9 29.6 19.9 47c0 29.9-24.3 54.2-54.2 54.2H112C50.1 256 0 306.1 0 368c0 20.9 13.4 38.7 32 45.3V464c0 26.5 21.5 48 48 48H432c26.5 0 48-21.5 48-48V413.3c18.6-6.6 32-24.4 32-45.3c0-61.9-50.1-112-112-112H366.2c-29.9 0-54.2-24.3-54.2-54.2zM416 416v32H96V416H416z"
        ></path>
    </svg>
)

const PaletteSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 512 512">
        <path
            fill="currentColor"
            d="M512 256c0 .9 0 1.8 0 2.7c-.4 36.5-33.6 61.3-70.1 61.3H344c-26.5 0-48 21.5-48 48c0 3.4 .4 6.7 1 9.9c2.1 10.2 6.5 20 10.8 29.9c6.1 13.8 12.1 27.5 12.1 42c0 31.8-21.6 60.7-53.4 62c-3.5 .1-7 .2-10.6 .2C114.6 512 0 397.4 0 256S114.6 0 256 0S512 114.6 512 256zM128 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm0-96a32 32 0 1 0 0-64 32 32 0 1 0 0 64zM288 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm96 96a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"
        ></path>
    </svg>
)

const FontSizeSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 576 512">
        <path
            fill="currentColor"
            d="M64 128V96h64l0 320H96c-17.7 0-32 14.3-32 32s14.3 32 32 32H224c17.7 0 32-14.3 32-32s-14.3-32-32-32H192l0-320h64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V80c0-26.5-21.5-48-48-48H160 48C21.5 32 0 53.5 0 80v48c0 17.7 14.3 32 32 32s32-14.3 32-32zM502.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-64 64c-9.2 9.2-11.9 22.9-6.9 34.9s16.6 19.8 29.6 19.8h32V352H416c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l64 64c12.5 12.5 32.8 12.5 45.3 0l64-64c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8H512V160h32c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-64-64z"
        ></path>
    </svg>
)

const SaveSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 448 512">
        <path fill="currentColor"
            d="M48 96l0 320c0 8.8 7.2 16 16 16l320 0c8.8 0 16-7.2 16-16l0-245.5c0-4.2-1.7-8.3-4.7-11.3l33.9-33.9c12 12 18.7 28.3 18.7 45.3L448 416c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l245.5 0c17 0 33.3 6.7 45.3 18.7l74.5 74.5-33.9 33.9L320.8 84.7c-.3-.3-.5-.5-.8-.8L320 184c0 13.3-10.7 24-24 24l-192 0c-13.3 0-24-10.7-24-24L80 80 64 80c-8.8 0-16 7.2-16 16zm80-16l0 80 144 0 0-80L128 80zm32 240a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z" />
    </svg>
)

const ExportSvg = () => (
    <svg height="1em" fill="currentColor" viewBox="0 0 1024 1024">
        <path d="M915.62666667 287.46666667h-0.32M915.30666667 632.10666667h0.32" fill="currentColor" p-id="1372"></path><path d="M968.85333333 732.05333333L831.36 595.30666667v102.4H638.93333333v68.8h192.42666667v102.29333333l137.49333333-136.74666667" fill="currentColor" p-id="1373"></path><path d="M55.14666667 134.72v753.38666667c0 0.53333333 0.10666667 0.96 0.10666666 1.49333333V133.22666667c0 0.53333333-0.10666667 0.96-0.10666666 1.49333333z" p-id="1374"></path><path d="M808.96 512.64h-0.42666667M808.53333333 857.28h0.42666667" fill="currentColor" p-id="1375"></path><path d="M157.86666667 990.82666667h547.94666666c58.24 0 102.72-44.48 102.72-102.72v-30.82666667h-68.48v30.82666667c0 20.58666667-13.65333333 34.24-34.24 34.24H157.86666667c-20.58666667 0-34.24-13.65333333-34.24-34.24V134.72c0-20.58666667 13.65333333-34.24 34.24-34.24h308.26666666v205.44c0.10666667 37.76 30.72 68.37333333 68.48 68.48h205.44v138.24H808.53333333V305.92c0-10.24-3.41333333-17.17333333-10.24-24L558.50666667 42.24c-6.82666667-6.82666667-13.65333333-10.24-24-10.24H157.86666667c-57.70666667 0-101.86666667 43.73333333-102.61333334 101.22666667V889.6c0.85333333 57.49333333 44.90666667 101.22666667 102.61333334 101.22666667z m376.74666666-876.58666667L726.4 305.92H534.61333333V114.24z" fill="currentColor" p-id="1376"></path><path d="M391.36 793.38666667h-79.57333333V416.10666667h116.26666666c103.36-1.38666667 154.34666667 37.44 152.96 116.26666666-2.77333333 73.38666667-46.18666667 112.21333333-130.56 116.26666667h-59.09333333v144.74666667z m0-314.02666667v106.02666667h24.42666667c54.4 5.44 80.85333333-12.26666667 79.57333333-53.01333334 0-36.69333333-26.56-54.4-79.57333333-53.01333333h-24.42666667z" fill="currentColor" p-id="1377"></path>
    </svg>
)

const NoteSvg = () => (
    <svg height="1em" viewBox="0 0 1024 1024">
        <path d="M66.782609 772.541217h196.051478a58.835478 58.835478 0 0 1 58.768696 58.768696v117.359304l235.78713-165.442782c9.928348-6.989913 21.615304-10.685217 33.747478-10.685218H957.217391V89.043478H66.782609v683.475479zM313.61113 1022.886957a58.768696 58.768696 0 0 1-58.768695-58.768696v-124.794435H58.724174A58.813217 58.813217 0 0 1 0 780.55513V81.029565A58.835478 58.835478 0 0 1 58.768696 22.26087h906.462608A58.835478 58.835478 0 0 1 1024 81.029565v699.503305a58.835478 58.835478 0 0 1-58.768696 58.768695H593.697391L347.336348 1012.201739c-10.106435 7.101217-21.904696 10.685217-33.725218 10.685218z" fill="currentColor"></path>
        <path d="M761.878261 326.032696h-499.756522a33.391304 33.391304 0 0 1 0-66.782609h499.756522a33.391304 33.391304 0 1 1 0 66.782609M761.878261 567.652174h-499.756522a33.391304 33.391304 0 0 1 0-66.782609h499.756522a33.391304 33.391304 0 1 1 0 66.782609" fill="currentColor"></path>
    </svg>
)

const SelectIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={SelectSvg} {...props} />

const HighlightIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={HighlightSvg} {...props} />

const StrikeoutIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={StrikeoutSvg} {...props} />

const UnderlineIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={UnderlineSvg} {...props} />

const FreetextIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={FreetextSvg} {...props} />

const RectangleIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={RectangleSvg} {...props} />

const CircleIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={EllipseSvg} {...props} />

const FreehandIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={FreehandSvg} {...props} />

const FreeHighlightIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={FreeHighlightSvg} {...props} />

const SignatureIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={SignatureSvg} {...props} />

const StampIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={StampSvg} {...props} />

const PaletteIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={PaletteSvg} {...props} />

const FontSizeIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={FontSizeSvg} {...props} />

const SaveIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={SaveSvg} {...props} />

const ExportIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={ExportSvg} {...props} />

const NoteIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={NoteSvg} {...props} />

export {
    CircleIcon,
    FontSizeIcon,
    FreehandIcon,
    FreeHighlightIcon,
    FreetextIcon,
    HighlightIcon,
    PaletteIcon,
    RectangleIcon,
    SelectIcon,
    SignatureIcon,
    StampIcon,
    StrikeoutIcon,
    UnderlineIcon,
    SaveIcon,
    ExportIcon,
    NoteIcon
}
