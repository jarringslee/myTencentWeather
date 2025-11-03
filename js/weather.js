const API_KEY = '26c72e9ee0d74fdd9429dc54bdf03f28';
const BASE_URL = 'https://np2r6wmpw6.re.qweatherapi.com/v7';
const GEO_URL = 'https:/np2r6wmpw6.re.qweatherapi.com/geo/v2';
//API key
//26c72e9ee0d74fdd9429dc54bdf03f28
//开发者id
//Q08849AC8A
//api host
//np2r6wmpw6.re.qweatherapi.com
// 默认城市
let defaultCity = '宝鸡';
//第四版新增
// 在现有的 defaultCity 变量附近添加
let userDefaultCity = null; // 用户设置的默认城市
const ORIGINAL_DEFAULT_CITY = '宝鸡'; // 原始默认城市
const ORIGINAL_DEFAULT_PROVINCE = '陕西省'; // 原始默认省份

//第三版更新补全天气图标
const textToPng = {
    "晴": "00.png",
    "多云": "01.png",
    "阴": "02.png",
    "阵雨": "03.png",
    "雷阵雨": "04.png",
    "小雨": "07.png",
    "中雨": "08.png",
    "暴雨": "10.png",
    "雾": "11.png"
}

$(document).ready(function () {
    // const API_KEY = '9f4f345e8ded4392b437e4391deabe65';
    // const BASE_URL = 'https://my38kxj2jr.re.qweatherapi.com/v7';
    // const GEO_URL = 'https://my38kxj2jr.re.qweatherapi.com/geo/v2';

    // 将 initFollowFeature 函数移到全局作用域
    function initFollowFeature() {
        // 绑定添加关注按钮事件
        $('#btn-attention').off('click').on('click', function (e) {
            e.stopPropagation();
            const currentCity = $('#txt-cur-location').text().trim();
            if (currentCity && currentCity !== '陕西省 宝鸡市') {
                // 解析当前城市信息
                const parts = currentCity.split(/\s+/);
                if (parts.length >= 2) {
                    const province = parts[0];
                    const city = parts[1];
                    addToFollowedCities(province, city);
                }
            }
        });

        // 使用事件委托绑定关注城市列表的事件
        $('#ls-attention').off('click').on('click', '.city', function (e) {
            // 点击城市本身时，切换到该城市
            if (!$(e.target).hasClass('btn')) {
                const province = $(this).data('province');
                const city = $(this).data('city');
                if (province && city) {
                    $('#txt-cur-location').html(province + '&nbsp;' + city);
                    getWeatherByCity(city);
                    // 更新关注按钮状态
                    updateFollowButtonState();
                }
            }
        });

        // 初始化关注城市显示
        loadFollowedCities();
        updateFollowedCitiesDisplay();
        // 初始化时更新关注按钮状态
        updateFollowButtonState();
    }

    // 将 getWeatherForFollowedCity 函数移到全局作用域
    function getWeatherForFollowedCity(province, city) {
        // 先获取城市地理位置信息
        $.ajax({
            url: `${GEO_URL}/city/lookup`,
            data: {
                location: city,
                key: API_KEY
            },
            success: function (geoData) {
                if (geoData.code === '200' && geoData.location.length > 0) {
                    const cityInfo = geoData.location[0];

                    // 获取当前天气
                    $.ajax({
                        url: `${BASE_URL}/weather/now`,
                        data: {
                            location: cityInfo.id,
                            key: API_KEY
                        },
                        success: function (weatherData) {
                            if (weatherData.code === '200') {
                                updateFollowedCityWeather(province, city, weatherData.now);
                            }
                        },
                        error: function () {
                            console.log(`获取${city}天气数据失败`);
                        }
                    });

                    // 获取7天天气预报获取最高最低温度
                    $.ajax({
                        url: `${BASE_URL}/weather/7d`,
                        data: {
                            location: cityInfo.id,
                            key: API_KEY
                        },
                        success: function (forecastData) {
                            if (forecastData.code === '200' && forecastData.daily.length > 0) {
                                const today = forecastData.daily[0];
                                updateFollowedCityTemperature(province, city, today);
                            }
                        },
                        error: function () {
                            console.log(`获取${city}温度数据失败`);
                        }
                    });
                }
            },
            error: function () {
                console.log(`获取${city}地理位置信息失败`);
            }
        });
    }

    // 将 updateFollowedCitiesDisplay 函数移到全局作用域
    function updateFollowedCitiesDisplay() {
        const followedCities = JSON.parse(localStorage.getItem('followedCities') || '[]');
        const $attentionList = $('#ls-attention');
        const currentDefault = JSON.parse(localStorage.getItem('userDefaultCity') || 'null');

        if (followedCities.length === 0) {
            $attentionList.html('<li id="tips-attention">点击"添加关注"添加城市哟~</li>');
            return;
        }

        $attentionList.empty();

        // 为每个关注的城市获取最新天气数据
        followedCities.forEach((cityInfo, index) => {
            const isDefault = currentDefault &&
                currentDefault.city === cityInfo.city &&
                currentDefault.province === cityInfo.province;

            // 创建符合要求的HTML结构
            const cityHtml = `
            <li class="city" data-province="${cityInfo.province}" data-city="${cityInfo.city}" data-district="">
                <div class="ct-location">
                    <p class="location">${cityInfo.city}</p>
                    ${isDefault ? '<p class="mark">默认</p>' : ''}
                    <a href="javascript:;" class="btn btn-set-default" 
                    data-province="${cityInfo.province}" data-city="${cityInfo.city}">
                        ${isDefault ? '取消默认' : '设为默认'}
                    </a>
                </div>
                <img class="icon" src="./img/day/00.png" alt="加载中..." title="加载中...">
                <p class="weather">加载中...</p>
                <p class="temperature">--°/--°</p>
                <a href="javascript:;" class="btn btn-delete" data-province="${cityInfo.province}" data-city="${cityInfo.city}" title="删除城市"></a>
            </li>
        `;

            $attentionList.append(cityHtml);

            // 为这个城市获取最新天气数据
            getWeatherForFollowedCity(cityInfo.province, cityInfo.city);
        });

        // 使用事件委托绑定按钮事件，确保动态添加的元素也能响应
        $attentionList.off('click', '.btn-set-default').on('click', '.btn-set-default', function (e) {
            e.stopPropagation();
            const province = $(this).data('province');
            const city = $(this).data('city');
            const isCurrentDefault = JSON.parse(localStorage.getItem('userDefaultCity') || 'null') &&
                JSON.parse(localStorage.getItem('userDefaultCity') || 'null').city === city &&
                JSON.parse(localStorage.getItem('userDefaultCity') || 'null').province === province;

            if (isCurrentDefault) {
                // 取消默认
                clearUserDefaultCity();
                showMessage('已取消默认城市设置');
            } else {
                // 设为默认
                setUserDefaultCity(province, city);
                showMessage(`已将 ${province} ${city} 设为默认城市`);
            }

            // 刷新显示
            updateFollowedCitiesDisplay();
        });

        // 使用事件委托绑定删除按钮事件
        $attentionList.off('click', '.btn-delete').on('click', '.btn-delete', function (e) {
            e.stopPropagation();
            const province = $(this).data('province');
            const city = $(this).data('city');

            // 确认删除
            // if (confirm(`确定要删除 ${province} ${city} 吗？`)) {
            removeFromFollowedCities(province, city);
            // }
        });
    }

    // 处理热门城市点击
    const hotCities = document.querySelectorAll('#ls-hot-city .opts');
    hotCities.forEach(city => {
        city.addEventListener('click', function () {
            const province = this.getAttribute('data-province');
            const cityName = this.getAttribute('data-city');
            document.getElementById('txt-cur-location').innerHTML = province + '&nbsp;' + cityName;
        });
    });

    // 处理历史城市点击
    const historyContainer = document.getElementById('ls-history');
    historyContainer.addEventListener('click', function (e) {
        if (e.target.tagName === 'LI' || e.target.parentElement.tagName === 'LI') {
            const cityElement = e.target.tagName === 'LI' ? e.target : e.target.parentElement;
            const province = cityElement.getAttribute('data-province');
            const cityName = cityElement.getAttribute('data-city');
            document.getElementById('txt-cur-location').innerHTML = province + '&nbsp;' + cityName;
        }
    });

    // 处理当前定位城市点击
    document.getElementById('cur-location').addEventListener('click', function () {
        const province = this.getAttribute('data-province');
        const cityName = this.getAttribute('data-city');
        document.getElementById('txt-cur-location').innerHTML = province + '&nbsp;' + cityName;
    });

    //添加城市关注功能
    // 在文件开头添加关注城市相关变量
    let followedCities = []; // 存储关注的城市
    const MAX_FOLLOWED_CITIES = 5; // 最大关注城市数量

    // 在init()函数中添加关注功能的初始化
    function initFollowFeature() {
        // 绑定添加关注按钮事件
        $('#btn-attention').off('click').on('click', function (e) {
            e.stopPropagation();
            const currentCity = $('#txt-cur-location').text().trim();
            if (currentCity && currentCity !== '陕西省 宝鸡市') {
                // 解析当前城市信息
                const parts = currentCity.split(/\s+/);
                if (parts.length >= 2) {
                    const province = parts[0];
                    const city = parts[1];
                    addToFollowedCities(province, city);
                }
            }
        });

        // 使用事件委托绑定关注城市列表的事件
        $('#ls-attention').off('click').on('click', '.city', function (e) {
            // 点击城市本身时，切换到该城市
            if (!$(e.target).hasClass('btn')) {
                const province = $(this).data('province');
                const city = $(this).data('city');
                if (province && city) {
                    $('#txt-cur-location').html(province + '&nbsp;' + city);
                    getWeatherByCity(city);
                }
            }
        });

        // 初始化关注城市显示
        loadFollowedCities();
        updateFollowedCitiesDisplay();
    }

    // 添加城市到关注列表 - 移到全局作用域
    function addToFollowedCities(province, city) {
        let followedCities = JSON.parse(localStorage.getItem('followedCities') || '[]');

        // 检查是否已存在
        const exists = followedCities.some(item =>
            item.province === province && item.city === city
        );

        if (exists) {
            showMessage('该城市已在关注列表中');
            // 更新关注按钮状态
            updateFollowButtonState();
            return;
        }

        // 检查数量限制
        if (followedCities.length >= 5) {
            showMessage('最多只能关注5个城市');
            return;
        }

        // 添加新城市
        followedCities.push({
            province: province,
            city: city,
            weather: '晴', // 可以从当前天气获取
            temperature: '--' // 可以从当前天气获取
        });

        localStorage.setItem('followedCities', JSON.stringify(followedCities));
        updateFollowedCitiesDisplay();
        updateFollowButtonState(); // 更新关注按钮状态
        showMessage(`已添加 ${province} ${city} 到关注列表`);
    }

    // 从关注列表移除城市 - 移到全局作用域
    function removeFromFollowedCities(province, city) {
        try {
            let followedCities = JSON.parse(localStorage.getItem('followedCities') || '[]');

            // 检查是否为当前默认城市
            const currentDefault = getUserDefaultCity();
            const isCurrentDefault = currentDefault &&
                currentDefault.city === city &&
                currentDefault.province === province;

            if (isCurrentDefault) {
                // 如果删除的是默认城市，清除默认设置
                clearUserDefaultCity();
                showMessage(`已删除默认城市 ${province} ${city}，恢复为原始默认城市`);
            }

            // 从列表中移除
            const originalLength = followedCities.length;
            followedCities = followedCities.filter(item =>
                !(item.province === province && item.city === city)
            );

            // 检查是否真的删除了城市
            if (followedCities.length < originalLength) {
                localStorage.setItem('followedCities', JSON.stringify(followedCities));
                updateFollowedCitiesDisplay();
                updateFollowButtonState(); // 更新关注按钮状态

                if (!isCurrentDefault) {
                    showMessage(`已删除 ${province} ${city}`);
                }
            } else {
                showMessage(`未找到城市 ${province} ${city}`);
            }
        } catch (error) {
            console.error('删除关注城市时出错:', error);
            showMessage('删除失败，请重试');
        }
    }


    // 加载已关注的城市
    function loadFollowedCities() {
        try {
            const stored = localStorage.getItem('followedCities');
            if (stored) {
                followedCities = JSON.parse(stored);
                console.log('从localStorage加载的关注城市:', followedCities);
                updateFollowedCitiesDisplay();
            } else {
                console.log('localStorage中没有关注城市数据');
                followedCities = [];
                updateFollowedCitiesDisplay();
            }
        } catch (error) {
            console.error('加载关注城市数据时出错:', error);
            followedCities = [];
            updateFollowedCitiesDisplay();
        }
    }

    // 保存关注的城市到localStorage
    function saveFollowedCities() {
        try {
            localStorage.setItem('followedCities', JSON.stringify(followedCities));
            console.log('保存到localStorage的关注城市:', followedCities);
        } catch (error) {
            console.error('保存关注城市数据时出错:', error);
        }
    }

    // 切换城市关注状态
    function toggleCityFollow() {
        // 获取当前城市信息
        const locationText = $('#txt-cur-location').text().trim();
        const parts = locationText.split(/\s+/);

        if (parts.length < 2) {
            alert('请先选择一个城市');
            return;
        }

        const province = parts[0];
        const city = parts[1];

        // 检查城市是否已关注
        const isFollowed = followedCities.some(item =>
            item.province === province && item.city === city
        );

        if (isFollowed) {
            // 取消关注
            unfollowCity(province, city);
        } else {
            // 添加关注
            followCity(province, city);
        }
    }

    // 关注城市
    function followCity(province, city) {
        // 检查是否达到最大数量
        if (followedCities.length >= MAX_FOLLOWED_CITIES) {
            $('#tips-attention-size').show();
            setTimeout(() => {
                $('#tips-attention-size').hide();
            }, 3000);
            return;
        }

        // 检查是否已存在
        const exists = followedCities.some(item =>
            item.province === province && item.city === city
        );

        if (!exists) {
            followedCities.push({ province, city });
            saveFollowedCities();
            updateFollowedCitiesDisplay();
            updateFollowButtonState();

            // 显示成功提示
            showFollowMessage('已关注 ' + city);
        }
    }

    // 取消关注城市
    function unfollowCity(province, city) {
        followedCities = followedCities.filter(item =>
            !(item.province === province && item.city === city)
        );

        saveFollowedCities();
        updateFollowedCitiesDisplay();
        updateFollowButtonState();

        // 显示取消关注提示
        showFollowMessage('已取消关注 ' + city);
    }

    // 更新关注城市的天气信息 - 移到全局作用域
    function updateFollowedCityWeather(province, city, weatherData) {
        const $cityItem = $(`#ls-attention .city[data-province="${province}"][data-city="${city}"]`);
        if ($cityItem.length > 0) {
            // 更新天气图标
            let iconFileName = '00.png'; // 默认晴天
            for (let key in textToPng) {
                if (weatherData.text && weatherData.text.includes(key)) {
                    iconFileName = textToPng[key];
                    break;
                }
            }

            // 判断白天/夜晚图标
            const now = new Date();
            const hour = now.getHours();
            const iconPath = (hour >= 6 && hour < 18) ? './img/day/' : './img/night/';

            $cityItem.find('.icon').attr({
                'src': `${iconPath}${iconFileName}`,
                'alt': weatherData.text,
                'title': weatherData.text
            });

            // 更新天气描述
            $cityItem.find('.weather').text(weatherData.text || '晴');
        }
    }

    // 更新关注城市的温度信息 - 移到全局作用域
    function updateFollowedCityTemperature(province, city, forecastData) {
        const $cityItem = $(`#ls-attention .city[data-province="${province}"][data-city="${city}"]`);
        if ($cityItem.length > 0) {
            const minTemp = forecastData.tempMin || '--';
            const maxTemp = forecastData.tempMax || '--';
            $cityItem.find('.temperature').text(`${minTemp}°/${maxTemp}°`);
        }
    }

    // 显示操作提示信息 - 移到全局作用域
    function showMessage(text) {
        // 创建或更新提示元素
        let $message = $('.follow-message');
        if ($message.length === 0) {
            $message = $('<div class="follow-message"></div>');
            $('body').append($message);
        }

        $message.text(text).fadeIn(300);

        setTimeout(() => {
            $message.fadeOut(300);
        }, 2000);
    }

    //第二版更新：搜索城市关键字高光效果
    /**
     * 高光关键字函数
     * @param {string} text - 原始文本
     * @param {string} keyword - 要高光的关键字
     * @returns {string} - 带有高光标签的HTML字符串
     */
    function highlightKeyword(text, keyword) {
        if (!keyword || keyword.trim() === '') {
            return text;
        }

        // 转义特殊正则字符，防止正则表达式错误
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 创建全局匹配的正则表达式，忽略大小写
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');

        // 替换匹配的关键字，添加高光标签
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    // 获取用户设置的默认城市 - 移到全局作用域
    function getUserDefaultCity() {
        const saved = localStorage.getItem('userDefaultCity');
        return saved ? JSON.parse(saved) : null;
    }

    // 设置用户默认城市 - 移到全局作用域
    function setUserDefaultCity(province, city) {
        const cityInfo = { province, city };
        localStorage.setItem('userDefaultCity', JSON.stringify(cityInfo));
        if (typeof userDefaultCity !== 'undefined') {
            userDefaultCity = cityInfo;
        }
    }

    // 清除用户默认城市 - 移到全局作用域
    function clearUserDefaultCity() {
        localStorage.removeItem('userDefaultCity');
        if (typeof userDefaultCity !== 'undefined') {
            userDefaultCity = null;
        }
    }

    // 获取当前应该显示的默认城市 - 移到全局作用域
    function getCurrentDefaultCity() {
        const saved = getUserDefaultCity();
        if (saved) {
            // 检查保存的默认城市是否还在关注列表中
            const followedCities = JSON.parse(localStorage.getItem('followedCities') || '[]');
            const isStillFollowed = followedCities.some(city =>
                city.city === saved.city && city.province === saved.province
            );

            if (isStillFollowed) {
                return saved;
            } else {
                // 如果默认城市已被取消关注，清除默认设置
                clearUserDefaultCity();
            }
        }

        return {
            province: ORIGINAL_DEFAULT_PROVINCE,
            city: ORIGINAL_DEFAULT_CITY
        };
    }


    // 添加防抖定时器变量
    let searchDebounceTimer = null;
    const SEARCH_DEBOUNCE_DELAY = 500; // 500ms防抖延迟



    // 生活指数页面状态
    let livingPageIndex = 0;

    // 初始化页面
    function init() {
        // 绑定搜索事件
        $('#search-btn').click(searchWeather);
        $('#search-input').keypress(function (e) {
            if (e.which === 13) {
                searchWeather();
            }
        });

        // 添加输入框输入事件监听（带防抖功能）
        $('#i-location').on('input', function () {
            const keyword = $(this).val().trim();

            // 清除之前的定时器
            clearTimeout(searchDebounceTimer);
            // 设置新的定时器
            searchDebounceTimer = setTimeout(() => {
                if (keyword.length > 0) {
                    searchCities(keyword);
                } else {
                    $('#ls-match').hide();
                }
            }, SEARCH_DEBOUNCE_DELAY);
        });

        // 添加点击搜索框显示热门城市的功能
        $('#i-location').click(function (e) {
            e.stopPropagation();
            const keyword = $(this).val().trim();
            if (keyword.length > 0) {
                searchCities(keyword);
            } else {
                $('#ct-hot-city').show();
            }
        });

        // 点击页面其他地方隐藏热门城市和搜索结果
        $(document).click(function (e) {
            if (!$(e.target).closest('#i-location, #ct-hot-city, #ls-match').length) {
                $('#ct-hot-city').hide();
                $('#ls-match').hide();
            }
        });

        // 绑定清除历史记录事件
        $('#btn-clean').click(function (e) {
            e.stopPropagation();
            localStorage.removeItem('weatherHistory');
            $('#ls-history').empty();
            $('#ct-history').hide();
        });


        // 当你选择一个城市后
        $('#ls-hot-city .opts').on('click', function () {
            const province = $(this).attr('data-province');
            const cityName = $(this).attr('data-city');
            $('#txt-cur-location').html(province + '&nbsp;' + cityName);
            getWeatherByCity(cityName);
            addToHistory(province, cityName); // 添加到历史记录
            updateHistoryDisplay(); // 更新历史记录显示
        });

        // 更新历史记录显示的函数
        function updateHistoryDisplay(history) {
            if (!history) {
                history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
            }

            const $historyList = $('#ls-history');
            $historyList.empty();

            history.forEach(item => {
                const $li = $(`<li class="opts" data-province="${item.province}" data-city="${item.city}">
            <span>${item.city}</span>
        </li>`);
                $historyList.append($li);
            });

            $('#ct-history').show();
        }

        const $mainContent = $("#ct-weather"),
            stepRange = [-(100 * 26) + 1140 + 60, 0],
            stepDistance = 1100;
        let curPosition = 0;

        $("#ct-hours #btn-prev").click(function (e) {
            const temp = curPosition + stepDistance;
            curPosition = (temp > stepRange[1] ? stepRange[1] : temp);
            $mainContent.css('marginLeft', `${curPosition}px`);
        });
        $("#ct-hours #btn-next").click(function (e) {
            const temp = curPosition - stepDistance;
            curPosition = (temp < stepRange[0] ? stepRange[0] : temp);
            $mainContent.css('marginLeft', `${curPosition}px`);
        });

        // 为生活指数区域的按钮绑定事件
        $('#ct-living-index #btn-prev').click(function () {
            switchLivingPage('prev');
        });

        $('#ct-living-index #btn-next').click(function () {
            switchLivingPage('next');
        });


        // 使用jQuery重新实现城市点击功能
        // 处理热门城市点击
        $('#ls-hot-city .opts').on('click', function () {
            const province = $(this).attr('data-province');
            const cityName = $(this).attr('data-city');
            $('#txt-cur-location').html(province + '&nbsp;' + cityName);
            getWeatherByCity(cityName);
            addToHistory(province, cityName); // 添加到历史记录
        });

        // 处理历史城市点击
        $('#ls-history').on('click', 'li', function () {
            const province = $(this).attr('data-province');
            const cityName = $(this).attr('data-city');
            $('#txt-cur-location').html(province + '&nbsp;' + cityName);
            getWeatherByCity(cityName);
        });

        // 处理当前定位城市点击
        $('#cur-location').on('click', function () {
            const province = $(this).attr('data-province');
            const cityName = $(this).attr('data-city');
            $('#txt-cur-location').html(province + '&nbsp;' + cityName);
            getWeatherByCity(cityName);
            addToHistory(province, cityName); // 添加到历史记录
        });

        // 页面加载时显示历史记录
        loadHistory();

        // 获取当前应该显示的默认城市
        const defaultCityInfo = getCurrentDefaultCity();
        userDefaultCity = getUserDefaultCity(); // 初始化用户默认城市变量

        // 加载默认城市天气，并同步显示默认城市信息
        $('#txt-cur-location').html(defaultCityInfo.province + '&nbsp;' + defaultCityInfo.city);
        getWeatherByCity(defaultCityInfo.city);

        // 添加默认城市到历史记录
        addToHistory(defaultCityInfo.province, defaultCityInfo.city);

        // 初始化关注城市功能
        initFollowFeature();

        // 更新关注城市显示
        updateFollowedCitiesDisplay();
    }

    // 搜索天气
    function searchWeather() {
        const city = $('#search-input').val().trim();
        if (city) {
            getWeatherByCity(city);
        }
    }

    // 添加城市到历史记录
    function addToHistory(province, city) {
        // 从localStorage获取历史记录
        let history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');

        // 检查城市是否已存在
        const existingIndex = history.findIndex(item => item.city === city);
        if (existingIndex !== -1) {
            // 如果存在，移到数组开头
            history.splice(existingIndex, 1);
        }

        // 添加到数组开头
        history.unshift({ province, city });

        // 限制最多4个城市
        if (history.length > 4) {
            history = history.slice(0, 4);
        }

        // 保存到localStorage
        localStorage.setItem('weatherHistory', JSON.stringify(history));

        // 更新历史记录显示
        updateHistoryDisplay();
    }

    // 加载历史记录
    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
        updateHistoryDisplay(history);
    }

    // 更新历史记录显示
    function updateHistoryDisplay(history) {
        if (!history) {
            history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
        }

        const $historyList = $('#ls-history');
        $historyList.empty();

        history.forEach(item => {
            const $li = $(`<li class="opts" data-province="${item.province}" data-city="${item.city}">
                <span>${item.city}</span>
            </li>`);
            $historyList.append($li);
        });
    }

    // 搜索城市（带防抖功能）
    function searchCities(keyword) {
        // 清除之前的搜索请求
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }

        // 发起新的搜索请求
        $.ajax({
            url: `${GEO_URL}/city/lookup`,
            data: {
                location: keyword,
                key: API_KEY,
                range: 'cn'
            },
            success: function (data) {
                if (data.code === '200' && data.location) {
                    displaySearchResults(data.location);
                } else {
                    $('#ls-match').hide();
                }
            },
            error: function () {
                $('#ls-match').hide();
            }
        });
    }

    // // 显示搜索结果
    // function displaySearchResults(cities) {
    //     const $matchList = $('#ls-match');
    //     $matchList.empty();

    //     if (cities.length === 0) {
    //         $matchList.hide();
    //         return;
    //     }

    //     cities.forEach(city => {
    //         const $li = $(`<li class="item" data-province="${city.adm1}" data-city="${city.name}" data-id="${city.id}">
    //             ${city.adm1} ${city.name}
    //         </li>`);
    //         $matchList.append($li);
    //     });

    //     // 绑定点击事件
    //     $matchList.find('.item').on('click', function () {
    //         const province = $(this).attr('data-province');
    //         const cityName = $(this).attr('data-city');
    //         const cityId = $(this).attr('data-id');

    //         $('#txt-cur-location').html(province + '&nbsp;' + cityName);
    //         $('#i-location').val('');
    //         $matchList.hide();
    //         $('#ct-hot-city').hide();

    //         // 获取天气信息
    //         getWeatherData(cityId);
    //         getAirQuality(cityId);
    //         getLivingIndexData(cityId);
    //         addToHistory(province, cityName);
    //     });

    //     $matchList.show();
    //     $('#ct-hot-city').hide();
    // }

    //获取搜索结果：添加关键字高光
    // 显示搜索结果
    function displaySearchResults(cities) {
        const $matchList = $('#ls-match');
        const keyword = $('#i-location').val().trim(); // 获取当前搜索关键字
        $matchList.empty();

        if (cities.length === 0) {
            $matchList.hide();
            return;
        }

        cities.forEach(city => {
            // 构建显示文本
            const displayText = `${city.adm1} ${city.name}`;

            // 对显示文本进行高光处理
            const highlightedText = highlightKeyword(displayText, keyword);

            const $li = $(`
            <li class="item" data-province="${city.adm1}" data-city="${city.name}" data-id="${city.id}">
                ${highlightedText}
            </li>
        `);
            $matchList.append($li);
        });

        // 绑定点击事件
        $matchList.find('.item').on('click', function () {
            const province = $(this).attr('data-province');
            const cityName = $(this).attr('data-city');
            const cityId = $(this).attr('data-id');

            $('#txt-cur-location').html(province + '&nbsp;' + cityName);
            $('#i-location').val('');
            $matchList.hide();
            $('#ct-hot-city').hide();

            // 获取天气信息
            getWeatherData(cityId);
            getAirQuality(cityId);
            getLivingIndexData(cityId);
            addToHistory(province, cityName);
        });

        $matchList.show();
        $('#ct-hot-city').hide();
    }


    // 根据城市名获取天气
    function getWeatherByCity(cityName) {
        // 先获取城市地理位置信息
        $.ajax({
            url: `${GEO_URL}/city/lookup`,
            data: {
                location: cityName,
                key: API_KEY
            },
            success: function (geoData) {
                if (geoData.code === '200' && geoData.location.length > 0) {
                    const cityInfo = geoData.location[0];
                    $('#city-name').text(cityInfo.name);
                    $('#city-adm').text(cityInfo.adm1 + ' ' + cityInfo.adm2);

                    // 同步更新页面顶部显示的城市信息
                    $('#txt-cur-location').html(cityInfo.adm1 + '&nbsp;' + cityInfo.name);

                    // 获取天气信息
                    getWeatherData(cityInfo.id);

                    // 获取空气质量
                    getAirQuality(cityInfo.id);

                    // 获取生活指数
                    getLivingIndexData(cityInfo.id);

                    // 更新关注按钮状态
                    setTimeout(() => {
                        updateFollowedCitiesDisplay();
                        updateFollowButtonState(); // 添加这一行
                    }, 100);
                } else {
                    alert('未找到该城市');
                }
            },
            error: function () {
                alert('获取城市信息失败');
            }
        });
    }


    function getTimeString(timeObj) {
        let now = timeObj
        // 获取各个时间部分
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份从0开始，补0
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        // 组合成自定义格式
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    function getWeatherDataNow(locationId) {
        $.ajax({
            url: `${BASE_URL}/weather/now`,
            data: {
                location: locationId,
                key: API_KEY
            },
            success: function (weatherData) {
                if (weatherData.code === '200') {
                    const now = weatherData.now;
                    console.log("🚀 ~ getWeatherData ~ now:", now)
                    $('#weather-icon').attr('class', `qi-${now.icon}`);
                    $('#txt-temperature').text(now.temp);
                    $('#txt-name').text(now.text);
                    $('#feels-like').text(now.feelsLike);
                    $('#txt-wind').text(`${now.windDir} ${now.windScale}级 `);
                    $('#txt-humidity').text(`湿度 ${now.humidity}%`);
                    $('#txt-kPa').text(`${now.pressure} hPa`);
                    $('#visibility').text(now.vis);
                    // 修改更新时间显示格式，只显示时分
                    const updateTime = new Date(now.obsTime);
                    const hours = updateTime.getHours().toString().padStart(2, '0');
                    const minutes = updateTime.getMinutes().toString().padStart(2, '0');
                    const hourTime = new Date(now.obsTime);
                    $('#txt-pub-time').text(`中央气象  ${hours}:${minutes}  发布`);

                    // 获取今天和明天的日出日落时间
                    const today = new Date();
                    console.log("🚀 ~ getWeatherData ~ today:", today)
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);

                    const todayString = getTimeString(today).split(' ')[0];
                    const tomorrowString = getTimeString(tomorrow).split(' ')[0];

                    // 获取今天和明天的日出日落数据
                    $.when(
                        getSunriseSunset(locationId, todayString),
                        getSunriseSunset(locationId, tomorrowString)
                    ).then(function (todaySunData, tomorrowSunData) {
                        let todaySunriseTime, todaySunsetTime, tomorrowSunriseTime, tomorrowSunsetTime;
                        if (todaySunData[0].code === '200') {
                            todaySunriseTime = new Date(todaySunData[0].sunrise);
                            todaySunsetTime = new Date(todaySunData[0].sunset);
                        }
                        if (tomorrowSunData[0].code === '200') {
                            tomorrowSunriseTime = new Date(tomorrowSunData[0].sunrise);
                            tomorrowSunsetTime = new Date(tomorrowSunData[0].sunset);
                        }

                        // 判断是白天还是夜晚，选择对应的图标
                        let iconPath = './img/day/';
                        // 确定使用哪一天的日出日落时间
                        let sunriseTime, sunsetTime;
                        if (hourTime.getDate() === today.getDate() && hourTime.getMonth() === today.getMonth()) {
                            sunriseTime = todaySunriseTime;
                            sunsetTime = todaySunsetTime;
                        } else {
                            sunriseTime = tomorrowSunriseTime;
                            sunsetTime = tomorrowSunsetTime;
                        }

                        if (sunriseTime && sunsetTime) {
                            // 判断当前时间是否在日出和日落之间
                            if (hourTime >= sunriseTime && hourTime < sunsetTime) {
                                // 白天
                                iconPath = './img/day/';
                            } else {
                                // 夜晚
                                iconPath = './img/night/';
                            }
                        }

                        let iconFileName = '11'; // 默认晴天
                        for (let key in textToPng) {
                            if (now.text.includes(key)) {
                                iconFileName = textToPng[key];
                                break;
                            }
                        }

                        $('#ct-current-weather').html(`<img class="icon" src="${iconPath}${iconFileName}">`);
                    });
                }
            }
        });
    }

    function getWeatherData7Day(locationId) {
        // 获取7天天气预报
        $.ajax({
            url: `${BASE_URL}/weather/7d`,
            data: {
                location: locationId,
                key: API_KEY
            },
            success: function (forecastData) {
                if (forecastData.code === '200') {
                    let forecastHtml = '';
                    const temperatureData = []; // 用于存储温度数据绘制图表
                    forecastData.daily.forEach((day, index) => {
                        if (index < 7) { // 只显示7天
                            // 收集温度数据用于绘制图表
                            temperatureData.push({
                                max: parseInt(day.tempMax),
                                min: parseInt(day.tempMin)
                            });

                            // 根据天气描述获取对应的图标
                            let dayIconFileName = '00.png'; // 默认晴天白天
                            let nightIconFileName = '00.png'; // 默认晴天夜晚

                            for (let key in textToPng) {
                                if (day.textDay.includes(key)) {
                                    dayIconFileName = textToPng[key];
                                    break;
                                }
                            }

                            for (let key in textToPng) {
                                if (day.textNight.includes(key)) {
                                    nightIconFileName = textToPng[key];
                                    break;
                                }
                            }

                            // 为今天添加second类名
                            const itemClass = index === 0 ? 'item second' : 'item';

                            forecastHtml += `
                                <li class="${itemClass}">
                                    <p class="day">${formatDate(day.fxDate)}</p>
                                    <p class="date">${formatMonthDate(day.fxDate)}</p>
                                    <div class="ct-daytime">
                                        <p class="weather">${day.textDay}</p>
                                        <img class="icon" src="./img/day/${dayIconFileName}" alt="${day.textDay}" title="${day.textDay}" />
                                    </div>
                                    <div class="ct-night">
                                        <img class="icon" src="./img/night/${nightIconFileName}" alt="${day.textNight}" title="${day.textNight}" />
                                        <p class="weather">${day.textNight}</p>
                                    </div>
                                    <p class="wind">${day.windDirDay} ${day.windScaleDay}级</p>
                                </li>
                            `;
                        }
                    });

                    // 获取昨天的历史天气数据
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.getFullYear() +
                        String(yesterday.getMonth() + 1).padStart(2, '0') +
                        String(yesterday.getDate()).padStart(2, '0');

                    $.ajax({
                        url: `${BASE_URL}/historical/weather`,
                        data: {
                            location: locationId,
                            date: yesterdayStr,
                            key: API_KEY
                        },
                        success: function (historicalData) {
                            if (historicalData.code === '200') {
                                // 构建昨天的天气信息
                                const weatherDaily = historicalData.weatherDaily;
                                const weatherHourly = historicalData.weatherHourly;

                                // 获取9点和21点的天气描述
                                let dayTimeWeather = '';
                                let nightTimeWeather = '';

                                // 获取风向和风力等级信息
                                let dayWindDir = '1微风1';
                                let dayWindScale = '11-3';
                                let nightWindDir = '1微风';
                                let nightWindScale = '11-3';

                                if (weatherHourly) {
                                    weatherHourly.forEach(hour => {
                                        const hourTime = new Date(hour.time);
                                        if (hourTime.getHours() === 9) {
                                            dayTimeWeather = hour.text;
                                            // 获取9点的风向和风力等级
                                            if (hour.windDir) dayWindDir = hour.windDir;
                                            if (hour.windScale) dayWindScale = hour.windScale;
                                        } else if (hourTime.getHours() === 21) {
                                            nightTimeWeather = hour.text;
                                            // 获取21点的风向和风力等级
                                            if (hour.windDir) nightWindDir = hour.windDir;
                                            if (hour.windScale) nightWindScale = hour.windScale;
                                        }
                                    });
                                }

                                // 根据天气描述获取对应的图标
                                let dayIconFileName = '00.png'; // 默认晴天白天
                                let nightIconFileName = '00.png'; // 默认晴天夜晚

                                if (dayTimeWeather) {
                                    for (let key in textToPng) {
                                        if (dayTimeWeather.includes(key)) {
                                            dayIconFileName = textToPng[key];
                                            break;
                                        }
                                    }
                                }

                                if (nightTimeWeather) {
                                    for (let key in textToPng) {
                                        if (nightTimeWeather.includes(key)) {
                                            nightIconFileName = textToPng[key];
                                            break;
                                        }
                                    }
                                }

                                // 构建昨天的HTML
                                const yesterdayHtml = `
                                    <li class="item first" style="width: 92px">
                                        <p class="day">昨天</p>
                                        <p class="date">${formatMonthDate(weatherDaily.date)}</p>
                                        <div class="ct-daytime">
                                            <p class="weather">${dayTimeWeather || '晴'}</p>
                                            <img class="icon" src="./img/day/${dayIconFileName}" alt="${dayTimeWeather || '晴'}" title="${dayTimeWeather || '晴'}" />
                                        </div>
                                        <div class="ct-night">
                                            <img class="icon" src="./img/night/${nightIconFileName}" alt="${nightTimeWeather || '晴'}" title="${nightTimeWeather || '晴'}" />
                                            <p class="weather">${nightTimeWeather || '晴'}</p>
                                        </div>
                                        <p class="wind">${dayWindDir} ${dayWindScale}级</p>
                                    </li>
                                `;

                                // 将昨天的天气信息插入到forecastHtml的开头
                                forecastHtml = yesterdayHtml + forecastHtml;

                                // 将昨天的温度数据插入到temperatureData的开头
                                temperatureData.unshift({
                                    max: parseInt(weatherDaily.tempMax),
                                    min: parseInt(weatherDaily.tempMin)
                                });
                            }

                            $('#ls-weather-day').html(forecastHtml);

                            // 绘制温度图表
                            drawTemperatureChart(temperatureData);
                        },
                        error: function () {
                            // 如果获取历史数据失败，仍然显示原来的预报数据
                            $('#ls-weather-day').html(forecastHtml);

                            // 绘制温度图表（不包括昨天的数据）
                            drawTemperatureChart(temperatureData);
                        }
                    });
                }
            }
        });
    }

    // 绘制温度图表
    function drawTemperatureChart(temperatureData) {
        console.log(temperatureData);
        const chartContainer = document.getElementById('chart-days');
        if (!chartContainer) return;

        // 清空容器
        chartContainer.innerHTML = '<canvas id="temperature-chart"></canvas>';

        const canvas = document.getElementById('temperature-chart');
        const ctx = canvas.getContext('2d');

        // 设置canvas尺寸
        const containerWidth = chartContainer.offsetWidth;
        const containerHeight = chartContainer.offsetHeight;
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        if (temperatureData.length === 0) return;

        // 计算温度范围
        let maxTemp = -Infinity;
        let minTemp = Infinity;

        temperatureData.forEach(data => {
            if (data.max > maxTemp) maxTemp = data.max;
            if (data.min < minTemp) minTemp = data.min;
        });

        // 添加一些边距
        const tempRange = maxTemp - minTemp;
        const padding = tempRange * 0.1;
        maxTemp += padding;
        minTemp -= padding;

        // 计算坐标点 - 添加上下边距
        const pointCount = temperatureData.length;
        // 修改x轴位置计算方式，使每个点位于每段的中间位置
        const segmentWidth = containerWidth / pointCount;
        const xStep = segmentWidth;
        // 添加上下边距，将绘图区域缩小
        const verticalPadding = 20;
        const chartHeight = containerHeight - verticalPadding * 2;
        const yScale = chartHeight / (maxTemp - minTemp);

        // 绘制最高温度折线
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(252, 195, 112)';
        ctx.lineWidth = 2;

        const maxPoints = [];
        for (let i = 0; i < pointCount; i++) {
            // 修改x坐标计算方式，使点位于每段的中间位置
            const x = i * xStep + segmentWidth / 2;

            // 添加垂直边距偏移
            const y = containerHeight - verticalPadding - (temperatureData[i].max - minTemp) * yScale;
            maxPoints.push({ x, y });
            console.log(x, y);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // 绘制最高温度圆点和温度值
        ctx.fillStyle = 'rgb(252, 195, 112)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        maxPoints.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // 绘制最高温度值
            ctx.fillText(temperatureData[index].max + '°', point.x, point.y - 10);
        });

        // 绘制最低温度折线
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(148, 204, 249)';
        ctx.lineWidth = 2;

        const minPoints = [];
        for (let i = 0; i < pointCount; i++) {
            // 修改x坐标计算方式，使点位于每段的中间位置
            const x = i * xStep + segmentWidth / 2;
            // 添加垂直边距偏移
            const y = containerHeight - verticalPadding - (temperatureData[i].min - minTemp) * yScale;
            minPoints.push({ x, y });

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // 绘制最低温度圆点和温度值
        ctx.fillStyle = 'rgb(148, 204, 249)';
        ctx.textBaseline = 'top';
        minPoints.forEach((point, index) => {
            ctx.beginPath();

            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // 绘制最低温度值
            ctx.fillText(temperatureData[index].min + '°', point.x, point.y + 10);
        });
    }

    // 获取日出日落时间
    function getSunriseSunset(locationId, date) {
        // 将日期格式从 yyyy-MM-dd 转换为 yyyyMMdd
        const formattedDate = date.replace(/-/g, '');

        return $.ajax({
            url: `${BASE_URL}/astronomy/sun`,
            data: {
                location: locationId,
                key: API_KEY,
                date: formattedDate
            }
        });
    }


    function getWeatherDataHours(locationId) {
        // 获取天气数据 逐小时
        $.ajax({
            url: `${BASE_URL}/weather/24h`,
            data: {
                location: locationId,
                key: API_KEY
            },
            success: function (hourlyData) {
                if (hourlyData.code === '200') {
                    // 获取今天和明天的日出日落时间
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    const todayString = getTimeString(today).split(' ')[0];
                    const tomorrowString = getTimeString(tomorrow).split(' ')[0];

                    // 获取今天和明天的日出日落数据
                    $.when(
                        getSunriseSunset(locationId, todayString),
                        getSunriseSunset(locationId, tomorrowString)
                    ).then(function (todaySunData, tomorrowSunData) {
                        let hourlyHtml = '';
                        const now = new Date();
                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);

                        // 获取今天和明天的日出和日落时间
                        let todaySunriseTime, todaySunsetTime, tomorrowSunriseTime, tomorrowSunsetTime;
                        if (todaySunData[0].code === '200') {
                            todaySunriseTime = new Date(todaySunData[0].sunrise);
                            todaySunsetTime = new Date(todaySunData[0].sunset);
                        }
                        if (tomorrowSunData[0].code === '200') {
                            tomorrowSunriseTime = new Date(tomorrowSunData[0].sunrise);
                            tomorrowSunsetTime = new Date(tomorrowSunData[0].sunset);
                        }

                        hourlyData.hourly.forEach((hour, index) => {
                            const hourTime = new Date(hour.fxTime);
                            let timeText;

                            // 判断是否跨天
                            if (hourTime.getDate() === now.getDate() && hourTime.getMonth() === now.getMonth()) {
                                timeText = `${hourTime.getHours().toString().padStart(2, '0')}:00`;
                            } else if (hourTime.getDate() === tomorrow.getDate() && hourTime.getMonth() === tomorrow.getMonth()) {
                                if (index === 0) {
                                    timeText = '明天';
                                } else {
                                    timeText = `${hourTime.getHours().toString().padStart(2, '0')}:00`;
                                }
                            } else {
                                timeText = `${hourTime.getHours().toString().padStart(2, '0')}:00`;
                            }

                            // 特殊处理日出时间
                            let isSunrise = false;
                            let isSunset = false;
                            let sunTime = null;

                            // 检查是否为今天的日出日落时间
                            if (todaySunriseTime &&
                                hourTime.getHours() === todaySunriseTime.getHours() &&
                                hourTime.getDate() === todaySunriseTime.getDate() &&
                                hourTime.getMonth() === todaySunriseTime.getMonth()) {
                                isSunrise = true;
                                sunTime = todaySunriseTime;
                            } else if (todaySunsetTime &&
                                hourTime.getHours() === todaySunsetTime.getHours() &&
                                hourTime.getDate() === todaySunsetTime.getDate() &&
                                hourTime.getMonth() === todaySunsetTime.getMonth()) {
                                sunTime = todaySunsetTime;
                                isSunset = true;
                            }

                            // 检查是否为明天的日出日落时间
                            if (tomorrowSunriseTime &&
                                hourTime.getHours() === tomorrowSunriseTime.getHours() &&
                                hourTime.getDate() === tomorrowSunriseTime.getDate() &&
                                hourTime.getMonth() === tomorrowSunriseTime.getMonth()) {
                                isSunrise = true;
                                sunTime = tomorrowSunriseTime;
                            } else if (tomorrowSunsetTime &&
                                hourTime.getHours() === tomorrowSunsetTime.getHours() &&
                                hourTime.getDate() === tomorrowSunsetTime.getDate() &&
                                hourTime.getMonth() === tomorrowSunsetTime.getMonth()) {
                                isSunset = true;
                                sunTime = tomorrowSunsetTime;
                            }


                            // 判断是白天还是夜晚，选择对应的图标
                            let iconPath = './img/day/';
                            // 确定使用哪一天的日出日落时间
                            let sunriseTime, sunsetTime;
                            if (hourTime.getDate() === today.getDate() && hourTime.getMonth() === today.getMonth()) {
                                sunriseTime = todaySunriseTime;
                                sunsetTime = todaySunsetTime;
                            } else {
                                sunriseTime = tomorrowSunriseTime;
                                sunsetTime = tomorrowSunsetTime;
                            }

                            if (sunriseTime && sunsetTime) {
                                // 判断当前时间是否在日出和日落之间
                                if (hourTime >= sunriseTime && hourTime < sunsetTime) {
                                    // 白天
                                    iconPath = './img/day/';
                                } else {
                                    // 夜晚
                                    iconPath = './img/night/';
                                }
                            }

                            // 根据天气描述获取对应的图标
                            let iconFileName = '11'; // 默认晴天
                            for (let key in textToPng) {
                                if (hour.text.includes(key)) {
                                    iconFileName = textToPng[key];
                                    break;
                                }
                            }

                            if (iconFileName === '11') {
                                console.log("🚀 ~ getWeatherDataHours ~ iconFileName:", hour.text)
                            }

                            hourlyHtml += `
                                    <li class="item">
                                        <p class="txt-time">${timeText}</p>
                                        <img src="${iconPath}${iconFileName}" alt="${hour.text}" class="icon" />
                                        <p class="txt-degree">${hour.temp}°</p>
                                    </li>
                                `;
                            let hours = null;
                            let minutes = null;
                            if (isSunrise || isSunset) {
                                hours = sunTime.getHours().toString().padStart(2, '0');
                                minutes = sunTime.getMinutes().toString().padStart(2, '0');
                            }
                            if (isSunrise) {
                                hourlyHtml += `
                                    <li class="item">
                                        <p class="txt-time">${hours}:${minutes}</p>
                                        <img src="./img/rise.png" alt="日出" title="日出" class="icon large-icon" />
                                        <p class="txt-degree">日出</p>
                                    </li>
                                `;
                            } else if (isSunset) {
                                hourlyHtml += `
                                    <li class="item">
                                        <p class="txt-time">${hours}:${minutes}</p>
                                        <img src="./img/set.png" alt="日落" title="日落" class="icon large-icon" />
                                        <p class="txt-degree">日落</p>
                                    </li>
                                `;
                            }
                        }
                        );

                        $('#ls-weather-hour').html(hourlyHtml);
                    });
                }
            }
        });
    }

    // 获取天气数据
    function getWeatherData(locationId) {
        getWeatherDataNow(locationId)

        getWeatherData7Day(locationId)

        getWeatherDataHours(locationId)

        getWeatherWarning(locationId) // 添加这一行
    }

    // 新增获取天气预警信息的函数
    function getWeatherWarning(locationId) {
        $.ajax({
            url: `${BASE_URL}/warning/now`,
            data: {
                location: locationId,
                key: API_KEY
            },
            success: function (warningData) {
                if (warningData.code === '200') {
                    const $warningList = $('#ls-warning');
                    $warningList.empty();

                    if (warningData.warning && warningData.warning.length > 0) {
                        warningData.warning.forEach(warning => {
                            // 根据严重程度确定class
                            let levelClass = 'level01';
                            if (warning.level && warning.level.includes('黄')) {
                                levelClass = 'level02';
                            } else if (warning.level && warning.level.includes('橙')) {
                                levelClass = 'level03';
                            } else if (warning.level && warning.level.includes('红')) {
                                levelClass = 'level04';
                            }

                            const warningItem = `
                                <li class="tag ${levelClass}">
                                    ${warning.typeName}
                                    <div class="popwindow warning-window">
                                        <div class="header">${warning.typeName}</div>
                                        <div class="detail">
                                            <div class="inner">
                                                <p>
                                                    ${warning.text}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            `;
                            $warningList.append(warningItem);
                        });
                    }
                }
            },
            error: function () {
                console.log('获取天气预警信息失败');
            }
        });
    }

    // 获取空气质量
    function getAirQuality(locationId) {
        // 先获取城市地理位置信息
        $.ajax({
            url: `${GEO_URL}/city/lookup`,
            data: {
                location: locationId,
                key: API_KEY
            },
            success: function (geoData) {
                if (geoData.code === '200' && geoData.location.length > 0) {
                    const cityInfo = geoData.location[0];
                    const lat = cityInfo.lat;
                    const lon = cityInfo.lon;

                    // 使用经纬度获取空气质量数据
                    $.ajax({
                        url: `https://my38kxj2jr.re.qweatherapi.com/airquality/v1/current/${lat}/${lon}`,
                        data: {
                            key: API_KEY
                        },
                        success: function (airData) {
                            console.log("🚀 ~ getAirQuality ~ airData:", airData)
                            if (airData) {
                                const index = airData.indexes[0]; // 主要空气质量指数
                                console.log("🚀 ~ getAirQuality ~ index:", index)
                                const pollutants = airData.pollutants;

                                // 更新空气质量显示
                                $('.info-aqi').text(index.aqiDisplay + ' ' + (index.category || ''));

                                // 更新弹窗标题
                                $('.air-window .header').text(`空气质量指数 ${index.aqiDisplay}&nbsp;${index.category || ''}`);

                                // 更新污染物数值
                                pollutants.forEach(pollutant => {
                                    let pollutantCode = pollutant.code.toUpperCase();
                                    if (pollutantCode === 'PM2P5') pollutantCode = 'PM2.5';
                                    if (pollutantCode === 'PM10') pollutantCode = 'PM10';
                                    if (pollutantCode === 'SO2') pollutantCode = 'SO2';
                                    if (pollutantCode === 'NO2') pollutantCode = 'NO2';
                                    if (pollutantCode === 'O3') pollutantCode = 'O3';
                                    if (pollutantCode === 'CO') pollutantCode = 'CO';

                                    // 查找对应的表格项并更新
                                    const $td = $(`#tb-detail .titl:contains('${pollutantCode}')`).closest('td');
                                    $td.find('.val').text(pollutant.concentration.value);
                                });

                                // 设置空气质量等级样式
                                let airClass = '';
                                if (index.aqi <= 50) airClass = 'air-level1';
                                else if (index.aqi <= 100) airClass = 'air-level2';
                                else if (index.aqi <= 150) airClass = 'air-level3';
                                else if (index.aqi <= 200) airClass = 'air-level4';
                                else if (index.aqi <= 300) airClass = 'air-level5';
                                else airClass = 'air-level6';

                                $('#ct-aqi').removeClass('air-level1 air-level2 air-level3 air-level4 air-level5 air-level6').addClass(airClass);
                            }
                        },
                        error: function () {
                            console.log('获取空气质量数据失败');
                        }
                    });
                }
            },
            error: function () {
                console.log('获取城市地理位置信息失败');
            }
        });
    }

    // 获取生活指数数据
    function getLivingIndexData(locationId) {
        // 获取所有生活指数数据 (1天预报)
        $.ajax({
            url: `${BASE_URL}/indices/1d`,
            data: {
                location: locationId,
                key: API_KEY,
                type: '0' // 0表示获取所有生活指数
            },
            success: function (indexData) {
                if (indexData.code === '200' && indexData.daily) {
                    // 清空现有的生活指数内容
                    $('#ls-living1').empty();
                    $('#ls-living2').empty();

                    // 定义图标映射
                    const iconMap = {
                        '1': 'icon_yundong',      // 运动指数
                        '2': 'icon_xiche',        // 洗车指数
                        '3': 'icon_chuanyi_hot',  // 穿衣指数
                        '4': 'icon_diaoyu',       // 钓鱼指数
                        '5': 'icon_ziwaixian',      // 紫外线指数
                        '6': 'icon_lvyou',        // 旅游指数
                        '7': 'icon_guomin',        // 过敏指数
                        '8': 'icon_shushidu',     // 舒适度指数
                        '9': 'icon_ganmao',       // 感冒指数
                        '10': 'icon_wurankuosan', // 空气污染扩散条件指数
                        '14': 'icon_liangshai',   // 晾晒指数
                        '15': 'icon_jiaotong',     // 交通指数
                        '16': 'icon_fangshai'     // 防晒指数
                    };
                    const ls = ['7', '11', '12', '13']
                    const ids = [];
                    indexData.daily.forEach(item => {
                        if (ls.includes(item.type)) {
                            return;
                        }
                        ids.push(item)
                    })
                    console.log(ids)

                    // 分组处理数据，前6个放在第一页，其余放在第二页
                    ids.forEach((item, index) => {
                        if (ls.includes(item.type)) {
                            return;
                        }
                        const iconClass = iconMap[item.type] || 'icon';
                        const itemClass = index % 2 === 0 ? 'item odd' : 'item even';

                        const livingItem = `
                            <li class="${itemClass}">
                                <div class="ct-sub">
                                    <i class="icon ${iconClass}"></i>
                                    <p class="content">${item.name}&nbsp;${item.category}</p>
                                </div>
                                <div class="ct-detail">
                                    <div class="detail">
                                        ${item.text}
                                    </div>
                                </div>
                            </li>
                        `;

                        // 前6个放在第一页，其余放在第二页
                        if (index < 6) {
                            $('#ls-living1').append(livingItem);
                        } else {
                            $('#ls-living2').append(livingItem);
                        }
                    });
                }
            },
            error: function () {
                console.log('获取生活指数数据失败');
            }
        });
    }

    // 格式化更新时间
    function formatUpdateTime(datetime) {
        const date = new Date(datetime);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} 更新`;
    }

    // 格式化日期(用于星期几)
    function formatDate(dateStr) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const date = new Date(dateStr);
        const today = new Date();

        if (date.toDateString() === today.toDateString()) {
            return '今天';
        } else if (date.toDateString() === new Date(today.setDate(today.getDate() + 1)).toDateString()) {
            return '明天';
        } else {
            return days[date.getDay()];
        }
    }

    // 格式化月日日期
    function formatMonthDate(dateStr) {
        const date = new Date(dateStr);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}月${day}日`;
    }

    let currentPageIndex = 0;
    // 切换生活指数页面
    function switchLivingPage(direction) {
        const $content = $('#ct-content');
        const pageWidth = 440; // 每个页面的宽度
        const totalPages = 2; // 假设有两页

        if (direction === 'next' && currentPageIndex < totalPages - 1) {
            currentPageIndex++;
        } else if (direction === 'prev' && currentPageIndex > 0) {
            currentPageIndex--;
        }

        // 使用margin-left属性进行切换
        const newMarginLeft = `-${currentPageIndex * pageWidth}px`;
        $content.css('marginLeft', newMarginLeft);

        // 如果使用transform属性进行切换
        // const newTransform = `translateX(-${currentPageIndex * pageWidth}px)`;
        // $content.css('transform', newTransform);
    }


    // 时光机功能（历史天气）
    function getHistoricalWeather(locationId, date) {
        // 注意：历史天气数据需要付费API权限
        // 这里仅作为示例展示
        $.ajax({
            url: `${BASE_URL}/weather/historical`,
            data: {
                location: locationId,
                date: date,
                key: API_KEY
            },
            success: function (historicalData) {
                console.log('历史天气数据:', historicalData);
            },
            error: function () {
                console.log('历史天气数据获取失败或无权限');
            }
        });
    }

    // 更新关注按钮状态 - 新增函数
    function updateFollowButtonState() {
        const currentCity = $('#txt-cur-location').text().trim();
        if (!currentCity || currentCity === '陕西省 宝鸡市') {
            $('#btn-attention').text('添加关注');
            return;
        }

        // 解析当前城市信息
        const parts = currentCity.split(/\s+/);
        if (parts.length < 2) {
            $('#btn-attention').text('添加关注');
            return;
        }

        const province = parts[0];
        const city = parts[1];

        // 检查是否已关注
        let followedCities = JSON.parse(localStorage.getItem('followedCities') || '[]');
        const isFollowed = followedCities.some(item =>
            item.province === province && item.city === city
        );

        if (isFollowed) {
            $('#btn-attention').text('[已关注]');
        } else {
            $('#btn-attention').text('[添加关注]');
        }
    }

    // 初始化
    init();
});




